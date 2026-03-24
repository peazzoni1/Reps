import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage, DailySnapshot, CoachSession, MemoryBullet } from '../types';
import {
  getRecentDailySnapshots,
  getActiveCoachSession,
  createCoachSession,
  updateCoachSessionMessages,
  closeCoachSession,
  getArchivedCoachSessions,
  getSessionMemorySummaries,
  getDailyCoachMessageCount,
  incrementDailyCoachMessageCount,
} from '../services/storage';
import { sendChatMessage, generateSessionSummary } from '../services/anthropic';
import { Typography, Spacing, BorderRadius } from '../theme';
import { TabParamList } from '../navigation/TabNavigator';

const SESSION_MESSAGE_LIMIT = 5;
const DAILY_MESSAGE_LIMIT = 10;
const ACCENT = '#3db88a';
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

type SessionState = 'loading' | 'active' | 'summarizing' | 'ended';

function formatSessionDateRange(session: CoachSession): string {
  const start = new Date(session.startedAt);
  const end = session.endedAt ? new Date(session.endedAt) : new Date();
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', opts);
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

function firstUserMessage(session: CoachSession): string {
  const msg = session.messages.find((m) => m.role === 'user');
  if (!msg) return '(no messages)';
  return msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<TabParamList, 'Coach'>>();

  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [session, setSession] = useState<CoachSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentData, setRecentData] = useState<DailySnapshot[]>([]);
  const [memorySummaries, setMemorySummaries] = useState<{ date: string; bullets: MemoryBullet[] }[]>([]);
  const [pastSessionsVisible, setPastSessionsVisible] = useState(false);
  const [archivedSessions, setArchivedSessions] = useState<CoachSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [dailyCount, setDailyCount] = useState(0);

  const listRef = useRef<FlatList>(null);
  const appliedInitialMessage = useRef<string | null>(null);
  const lastActivityTime = useRef<number>(Date.now());

  // Check for inactivity timeout and start fresh session if needed
  const checkInactivityTimeout = useCallback(async () => {
    const timeSinceLastActivity = Date.now() - lastActivityTime.current;

    if (
      timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS &&
      sessionState === 'active' &&
      messages.length > 0
    ) {
      // Session has been inactive for too long, start fresh
      const newSession = await createCoachSession();
      setSession(newSession);
      setMessages([]);
      appliedInitialMessage.current = null;
      setSessionState('active');
      lastActivityTime.current = Date.now();
    }
  }, [sessionState, messages.length]);

  // Check for timeout when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkInactivityTimeout();
    }, [checkInactivityTimeout])
  );

  // Listen for user sign-in event and reset chat session
  useEffect(() => {
    const handleUserSignIn = async () => {
      // Close any existing session and start fresh on login
      if (session) {
        const newSession = await createCoachSession();
        setSession(newSession);
        setMessages([]);
        appliedInitialMessage.current = null;
        setSessionState('active');
        lastActivityTime.current = Date.now();
      }
    };

    const signInListener = DeviceEventEmitter.addListener('userSignedIn', handleUserSignIn);

    return () => {
      signInListener.remove();
    };
  }, [session]);

  // Initialize: load or create active session, load supporting data
  useEffect(() => {
    const init = async () => {
      const [active, archived, memories, recent, count] = await Promise.all([
        getActiveCoachSession(),
        getArchivedCoachSessions(),
        getSessionMemorySummaries(),
        getRecentDailySnapshots(10),
        getDailyCoachMessageCount(),
      ]);
      setDailyCount(count);

      setRecentData(recent);
      setArchivedSessions(archived);
      setMemorySummaries(memories);

      if (active) {
        setSession(active);
        setMessages(active.messages);
        lastActivityTime.current = Date.now();
        // If app was closed while mid-summary, complete it now
        if (active.messages.length >= SESSION_MESSAGE_LIMIT) {
          triggerSessionEnd(active, active.messages);
        } else {
          setSessionState('active');
        }
      } else {
        const newSession = await createCoachSession();
        setSession(newSession);
        setSessionState('active');
        lastActivityTime.current = Date.now();
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply initialMessage from HomeScreen — update the seed as long as the user
  // hasn't started typing. If there are user messages, the conversation is real and
  // we leave it alone.
  useEffect(() => {
    const initialMessage = route.params?.initialMessage;
    if (!session || !initialMessage || initialMessage === appliedInitialMessage.current) return;
    appliedInitialMessage.current = initialMessage;
    const hasUserMessages = messages.some((m) => m.role === 'user');
    if (hasUserMessages) return;
    const msg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date().toISOString(),
    };
    const seeded = [msg];
    setMessages(seeded);
    updateCoachSessionMessages(session.id, seeded);
  }, [session, route.params?.initialMessage]);

  const triggerSessionEnd = useCallback(async (
    currentSession: CoachSession,
    allMessages: ChatMessage[]
  ) => {
    setSessionState('summarizing');
    try {
      // Step 1: generate summary (may fail — that's ok)
      let bullets: MemoryBullet[] | null = null;
      try {
        bullets = await generateSessionSummary(allMessages);
      } catch {
        // summary failed; fall through with null
      }

      // Step 2: close the session (protect individually so it always runs)
      try {
        await closeCoachSession(currentSession.id, bullets);
      } catch {
        // storage write failed — session may not be persisted, but still
        // transition the UI so the user isn't stuck
      }

      // Step 3: refresh archived list + memories
      const [archived, memories] = await Promise.all([
        getArchivedCoachSessions(),
        getSessionMemorySummaries(),
      ]);
      setArchivedSessions(archived);
      setMemorySummaries(memories);
    } finally {
      // Always move to ended, even if something above threw
      setSessionState('ended');
    }
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || sessionState !== 'active' || !session) return;
    if (dailyCount >= DAILY_MESSAGE_LIMIT) return;

    // Update last activity time
    lastActivityTime.current = Date.now();

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const withUser = [...messages, userMessage];
    setMessages(withUser);
    setInput('');
    setIsLoading(true);

    await updateCoachSessionMessages(session.id, withUser);

    let finalMessages = withUser;
    let sendSucceeded = false;

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(text, history, recentData, memorySummaries);

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };
      finalMessages = [...withUser, assistantMessage];
      setMessages(finalMessages);
      await updateCoachSessionMessages(session.id, finalMessages);
      sendSucceeded = true;
      const newCount = await incrementDailyCoachMessageCount();
      setDailyCount(newCount);
    } catch {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: "Sorry, I couldn't reach the AI right now. Please check your connection and try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }

    // Session end runs independently — errors here must not corrupt the chat UI
    if (sendSucceeded && finalMessages.length >= SESSION_MESSAGE_LIMIT) {
      triggerSessionEnd(session, finalMessages); // intentionally not awaited
    }
  };

  const handleStartFresh = async () => {
    const newSession = await createCoachSession();
    setSession(newSession);
    setMessages([]);
    appliedInitialMessage.current = null;
    setSessionState('active');
    lastActivityTime.current = Date.now();
  };

  const handleOpenPastSessions = async () => {
    const archived = await getArchivedCoachSessions();
    setArchivedSessions(archived);
    setExpandedSessionId(null);
    setPastSessionsVisible(true);
  };

  const scrollToBottom = () => {
    listRef.current?.scrollToEnd({ animated: true });
  };

  const dailyLimitReached = dailyCount >= DAILY_MESSAGE_LIMIT;
  const inputDisabled = isLoading || sessionState !== 'active' || dailyLimitReached;

  // ─── Renderers ────────────────────────────────────────────────────────────

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (sessionState === 'loading') return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Ask about your progress</Text>
        <Text style={styles.emptySubtitle}>
          I have access to your last 10 days of exercise and food data. Ask me anything.
        </Text>
        <View style={styles.suggestionsRow}>
          {['How am I doing this week?', 'Any patterns you notice?', 'What should I focus on?'].map(
            (suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={styles.suggestion}
                onPress={() => setInput(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    );
  };

  const renderSessionEndFooter = () => {
    if (sessionState === 'summarizing') {
      return (
        <View style={styles.typingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
          <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
            <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.6)" />
          </View>
        </View>
      );
    }
    if (sessionState === 'ended') {
      return (
        <View style={styles.sessionEndContainer}>
          <View style={[styles.messageRow, styles.messageRowAI]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AI</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleAI]}>
              <Text style={[styles.bubbleText, styles.bubbleTextAI]}>
                We've covered a good amount — I've noted the important things. Start a new session whenever you're ready.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.startFreshButton}
            onPress={handleStartFresh}
            activeOpacity={0.8}
          >
            <Text style={styles.startFreshText}>Start fresh →</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  // ─── Past conversations modal ──────────────────────────────────────────────

  const renderArchivedSession = (archivedSession: CoachSession) => {
    const isExpanded = expandedSessionId === archivedSession.id;
    return (
      <View key={archivedSession.id} style={styles.sessionRow}>
        <TouchableOpacity
          style={styles.sessionRowHeader}
          onPress={() => setExpandedSessionId(isExpanded ? null : archivedSession.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sessionRowInfo}>
            <Text style={styles.sessionRowDate}>{formatSessionDateRange(archivedSession)}</Text>
            <Text style={styles.sessionRowPreview} numberOfLines={1}>
              {firstUserMessage(archivedSession)}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-forward'}
            size={16}
            color="rgba(255, 255, 255, 0.6)"
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sessionThread}>
            {archivedSession.messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <View
                  key={msg.id}
                  style={[styles.threadRow, isUser ? styles.threadRowUser : styles.threadRowAI]}
                >
                  <View
                    style={[
                      styles.threadBubble,
                      isUser ? styles.threadBubbleUser : styles.threadBubbleAI,
                    ]}
                  >
                    <Text
                      style={[
                        styles.threadBubbleText,
                        isUser ? styles.threadBubbleTextUser : styles.threadBubbleTextAI,
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <TouchableOpacity onPress={handleOpenPastSessions} activeOpacity={0.7}>
              <Text style={styles.headerSubtitle}>
                {recentData.length > 0
                  ? `${recentData.length} day${recentData.length !== 1 ? 's' : ''} of data · `
                  : ''}
                <Text style={styles.headerSubtitleLink}>Past conversations →</Text>
              </Text>
            </TouchableOpacity>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity
              onPress={handleStartFresh}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={22} color={ACCENT} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderSessionEndFooter}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {isLoading && (
        <View style={styles.typingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
          <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
            <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.6)" />
          </View>
        </View>
      )}

      {/* Input bar / daily limit */}
      {dailyLimitReached ? (
        <View style={[styles.limitBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Text style={styles.limitTitle}>Daily limit reached</Text>
          <Text style={styles.limitSubtitle}>
            You've used your {DAILY_MESSAGE_LIMIT} free messages today. Come back tomorrow.
          </Text>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput
            style={[styles.input, inputDisabled && styles.inputDisabled]}
            value={input}
            onChangeText={setInput}
            placeholder={
              sessionState === 'ended'
                ? 'Start a fresh session to continue…'
                : 'Message your coach...'
            }
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            multiline
            maxLength={1000}
            returnKeyType="default"
            editable={!inputDisabled}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || inputDisabled) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || inputDisabled}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Past Conversations Modal */}
      <Modal
        visible={pastSessionsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPastSessionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setPastSessionsVisible(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Past Conversations</Text>
              <TouchableOpacity
                onPress={() => setPastSessionsVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>

            {archivedSessions.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No past conversations yet.</Text>
                <Text style={styles.modalEmptySubtext}>
                  When a session wraps up, it'll appear here.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.sessionList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sessionListContent}
              >
                {archivedSessions.map(renderArchivedSession)}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2e4f',
  },
  // ─── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(31, 46, 79, 0.97)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...Typography.headline,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.caption1,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  headerSubtitleLink: {
    color: ACCENT,
    fontWeight: '600',
  },
  // ─── Message list ─────────────────────────────────────────────────────────
  listContent: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.round,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  bubbleText: {
    ...Typography.body,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextAI: {
    color: '#ffffff',
  },
  // ─── Typing / loading indicators ─────────────────────────────────────────
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xs,
  },
  typingBubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  // ─── Session end state ────────────────────────────────────────────────────
  sessionEndContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  startFreshButton: {
    alignSelf: 'flex-start',
    marginLeft: 28 + Spacing.sm, // align with AI bubble (avatar width + gap)
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: ACCENT,
    marginTop: 4,
  },
  startFreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  // ─── Input bar ────────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    backgroundColor: 'rgba(31, 46, 79, 0.97)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    maxHeight: 120,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.round,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },
  // ─── Daily limit bar ─────────────────────────────────────────────────────
  limitBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(31, 46, 79, 0.97)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    gap: 4,
  },
  limitTitle: {
    ...Typography.subheadline,
    color: '#ffffff',
    fontWeight: '600',
  },
  limitSubtitle: {
    ...Typography.footnote,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },
  // ─── Empty state ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.title3,
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...Typography.subheadline,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  suggestionsRow: {
    marginTop: Spacing.base,
    gap: Spacing.sm,
    width: '100%',
  },
  suggestion: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  suggestionText: {
    ...Typography.subheadline,
    color: ACCENT,
    textAlign: 'center',
    fontWeight: '600',
  },
  // ─── Past conversations modal ─────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalSheet: {
    backgroundColor: '#1f2e4f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    maxHeight: '80%',
    // flex required so sessionList (flex: 1) has a defined-height parent
    flex: 1,
    justifyContent: 'flex-start',
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.headline,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  modalEmpty: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalEmptyText: {
    ...Typography.subheadline,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalEmptySubtext: {
    ...Typography.caption1,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  sessionList: {
    flex: 1,
  },
  sessionListContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  // ─── Session row ──────────────────────────────────────────────────────────
  sessionRow: {
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sessionRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  sessionRowInfo: {
    flex: 1,
    gap: 3,
  },
  sessionRowDate: {
    ...Typography.footnote,
    fontWeight: '600',
    color: '#ffffff',
  },
  sessionRowPreview: {
    ...Typography.caption1,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // ─── Thread (read-only) ───────────────────────────────────────────────────
  sessionThread: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: Spacing.sm,
  },
  threadRow: {
    flexDirection: 'row',
  },
  threadRowUser: {
    justifyContent: 'flex-end',
  },
  threadRowAI: {
    justifyContent: 'flex-start',
  },
  threadBubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
  },
  threadBubbleUser: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 3,
  },
  threadBubbleAI: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomLeftRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  threadBubbleText: {
    ...Typography.footnote,
    lineHeight: 18,
  },
  threadBubbleTextUser: {
    color: '#fff',
  },
  threadBubbleTextAI: {
    color: '#ffffff',
  },
});
