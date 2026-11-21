import { logger } from "@/lib/logger";

export class ApiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly requestId: string | null;

  constructor(status: number, method: string, path: string, requestId: string | null) {
    super("api request failed");
    this.status = status;
    this.method = method;
    this.path = path;
    this.requestId = requestId;
  }
}

const BEARER_STORAGE_KEY = "study_bearer_token";

function apiBase(): string {
  if (typeof window !== "undefined") {
    const runtime = (window as Window & { __STUDY_API_BASE__?: string }).__STUDY_API_BASE__;
    if (runtime) return runtime.replace(/\/$/, "");
  }
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured === undefined) return "http://127.0.0.1:18080";
  return configured.replace(/\/$/, "");
}

/** Tauri sets `window.__STUDY_API_BASE__`; use bearer sessions instead of cookies. */
export function isDesktopClient(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { __STUDY_API_BASE__?: string }).__STUDY_API_BASE__);
}

function bearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BEARER_STORAGE_KEY);
}

function setBearerToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token === null) window.localStorage.removeItem(BEARER_STORAGE_KEY);
  else window.localStorage.setItem(BEARER_STORAGE_KEY, token);
}

function clientHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isDesktopClient()) headers["x-study-client"] = "desktop";
  const token = bearerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const started = performance.now();
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...clientHeaders(),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      logger.error("api", "api request failed", {
        method,
        path,
        status: response.status,
        requestId,
        durationMs: Math.round(performance.now() - started),
      });
      throw new ApiError(response.status, method, path, requestId);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("api", "api request failed", {
      method,
      path,
      status: 0,
      requestId: null,
      durationMs: Math.round(performance.now() - started),
    });
    throw new ApiError(0, method, path, null);
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function apiSend<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  return request<T>(method, path, body);
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface LocalProfile {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export function listSubjects(): Promise<Subject[]> {
  return apiGet("/subjects");
}

export function getSubject(id: string): Promise<Subject> {
  return apiGet(`/subjects/${id}`);
}

export function createSubject(input: { name: string; description: string | null }): Promise<Subject> {
  return apiSend("POST", "/subjects", input);
}

export function updateSubject(
  id: string,
  input: { name: string; description: string | null },
): Promise<Subject> {
  return apiSend("PATCH", `/subjects/${id}`, input);
}

export function deleteSubject(id: string): Promise<void> {
  return apiSend("DELETE", `/subjects/${id}`);
}

export function listSettings(): Promise<Setting[]> {
  return apiGet("/settings");
}

export function createSetting(input: { key: string; value: string }): Promise<Setting> {
  return apiSend("POST", "/settings", input);
}

export function updateSetting(id: string, input: { key: string; value: string }): Promise<Setting> {
  return apiSend("PATCH", `/settings/${id}`, input);
}

export function listProfiles(): Promise<LocalProfile[]> {
  return apiGet("/local-profiles");
}

export function createProfile(input: { display_name: string }): Promise<LocalProfile> {
  return apiSend("POST", "/local-profiles", input);
}

export function updateProfile(id: string, input: { display_name: string }): Promise<LocalProfile> {
  return apiSend("PATCH", `/local-profiles/${id}`, input);
}

export interface Source {
  id: string;
  subject_id: string;
  title: string;
  kind: string;
  file_name: string;
  content_hash: string;
  status: string;
  error: string | null;
  progress: number;
  needs_reembed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  source_id: string;
  parent_id: string | null;
  title: string;
  position: number;
  is_core: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  source_id: string;
  topic_id: string;
  position: number;
  text: string;
  token_count: number;
  page_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchHit {
  chunk_id: string;
  source_id: string;
  source_title: string;
  topic_id: string;
  topic_title: string;
  page_ref: string | null;
  text: string;
  score: number;
}

export interface AiProvider {
  id: string;
  name: string;
  kind: string;
  base_url: string | null;
  has_api_key: boolean;
  api_key_hint: string | null;
  chat_model: string;
  embedding_model: string;
  embedding_dimensions: number;
  created_at: string;
  updated_at: string;
}

async function uploadRequest<T>(path: string, form: FormData): Promise<T> {
  const started = performance.now();
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
      body: form,
    });
    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      logger.error("api", "api request failed", {
        method: "POST",
        path,
        status: response.status,
        requestId,
        durationMs: Math.round(performance.now() - started),
      });
      throw new ApiError(response.status, "POST", path, requestId);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("api", "api request failed", {
      method: "POST",
      path,
      status: 0,
      requestId: null,
      durationMs: Math.round(performance.now() - started),
    });
    throw new ApiError(0, "POST", path, null);
  }
}

export function listSources(subjectId?: string): Promise<Source[]> {
  const query = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : "";
  return apiGet(`/sources${query}`);
}

export function getSource(id: string): Promise<Source> {
  return apiGet(`/sources/${id}`);
}

export function uploadSource(input: {
  subjectId: string;
  file: File;
  title?: string;
  kind?: string;
}): Promise<Source> {
  const form = new FormData();
  form.append("subject_id", input.subjectId);
  form.append("file", input.file);
  if (input.title) form.append("title", input.title);
  if (input.kind) form.append("kind", input.kind);
  return uploadRequest("/sources", form);
}

export function deleteSource(id: string): Promise<void> {
  return apiSend("DELETE", `/sources/${id}`);
}

export function reembedSource(id: string): Promise<Source> {
  return apiSend("POST", `/sources/${id}/reembed`);
}

export function listTopics(sourceId: string): Promise<Topic[]> {
  return apiGet(`/topics?source_id=${encodeURIComponent(sourceId)}`);
}

export function updateTopic(
  id: string,
  input: { title?: string; position?: number; is_core?: boolean },
): Promise<Topic> {
  return apiSend("PATCH", `/topics/${id}`, input);
}

export function listChunks(sourceId: string, topicId?: string): Promise<Chunk[]> {
  const params = new URLSearchParams({ source_id: sourceId });
  if (topicId) params.set("topic_id", topicId);
  return apiGet(`/chunks?${params.toString()}`);
}

export function searchChunks(input: {
  query: string;
  subject_id?: string;
  source_id?: string;
  topic_id?: string;
  limit?: number;
}): Promise<SearchHit[]> {
  return apiSend("POST", "/search", input);
}

export function listProviders(): Promise<AiProvider[]> {
  return apiGet("/ai-providers");
}

export function createProvider(input: {
  name: string;
  kind: string;
  base_url?: string | null;
  api_key?: string | null;
  chat_model: string;
  embedding_model: string;
  embedding_dimensions: number;
}): Promise<AiProvider> {
  return apiSend("POST", "/ai-providers", input);
}

export function updateProvider(
  id: string,
  input: {
    name?: string;
    base_url?: string | null;
    api_key?: string | null;
    clear_api_key?: boolean;
    chat_model?: string;
    embedding_model?: string;
    embedding_dimensions?: number;
  },
): Promise<AiProvider> {
  return apiSend("PATCH", `/ai-providers/${id}`, input);
}

export function deleteProvider(id: string): Promise<void> {
  return apiSend("DELETE", `/ai-providers/${id}`);
}

export function testProvider(providerId?: string): Promise<{ ok: boolean; message: string }> {
  return apiSend("POST", "/ai-providers/test", { provider_id: providerId ?? null });
}

export function setDefaultProvider(providerId: string): Promise<void> {
  return apiSend("POST", "/ai-providers/default", { provider_id: providerId });
}

export interface SessionScope {
  source_ids: string[];
  topic_ids: string[];
}

export interface StudySession {
  id: string;
  subject_id: string;
  scope: SessionScope | Record<string, unknown>;
  grounding_mode: string;
  burst_size: number;
  mode: string;
  started_at: string;
  ended_at: string | null;
}

export interface QuestionPublic {
  id: string;
  subject_id: string;
  source_id: string | null;
  topic_id: string | null;
  kind: string;
  cognitive_level: string;
  stem: string;
  options: string[] | null;
  grounding: string;
  citations: {
    type?: string;
    chunk_ids?: string[];
    url?: string;
    excerpt?: string;
  };
  is_gold: boolean;
  gold_status: string;
  status: string;
  generated_by: string | null;
  prompt_version: string | null;
  created_at: string;
}

export interface Question extends QuestionPublic {
  correct_option?: string | null;
  model_answer?: string | null;
  explanation?: string | null;
}

export interface Attempt {
  id: string;
  question_id: string;
  session_id: string;
  answer_text: string | null;
  selected_option: string | null;
  score: number;
  verdict: string;
  feedback: {
    corrections?: string[];
    additions?: string[];
    missing_points?: string[];
    model_answer?: string | null;
  };
  graded_by: string;
  confidence: number | null;
  original_score: number | null;
  original_verdict: string | null;
  time_taken_ms: number | null;
  created_at: string;
}

export interface BurstResponse {
  session: StudySession;
  burst_index: number;
  questions: QuestionPublic[];
  answered_ids: string[];
  partial_error: string | null;
}

export interface AnswerResponse {
  attempt: Attempt;
  question: Question;
  low_confidence: boolean;
}

export interface QuestionSettings {
  default_burst_size: number;
  cognitive_mix: {
    recall: number;
    understand: number;
    apply: number;
    analyze: number;
  };
  default_grounding_mode: string;
}

export interface WebSearchProvider {
  id: string;
  name: string;
  endpoint: string;
  has_api_key: boolean;
  api_key_hint: string | null;
  created_at: string;
  updated_at: string;
}

export function createSession(input: {
  subject_id: string;
  scope: SessionScope;
  grounding_mode: string;
  burst_size?: number;
  resume_session_id?: string;
  mode?: string;
}): Promise<StudySession> {
  return apiSend("POST", "/sessions", input);
}

export function listOpenSessions(subjectId: string): Promise<StudySession[]> {
  return apiGet(`/sessions?subject_id=${encodeURIComponent(subjectId)}`);
}

export function getSession(id: string): Promise<StudySession> {
  return apiGet(`/sessions/${id}`);
}

export function endSession(id: string): Promise<StudySession> {
  return apiSend("POST", `/sessions/${id}/end`);
}

export function fetchBurst(sessionId: string): Promise<BurstResponse> {
  return apiGet(`/sessions/${sessionId}/burst`);
}

export function submitAnswer(
  sessionId: string,
  input: {
    question_id: string;
    answer_text?: string;
    selected_option?: string;
    time_taken_ms?: number;
  },
): Promise<AnswerResponse> {
  return apiSend("POST", `/sessions/${sessionId}/answer`, input);
}

export function overrideGrade(
  sessionId: string,
  attemptId: string,
  input: { verdict: string; score?: number },
): Promise<Attempt> {
  return apiSend("POST", `/sessions/${sessionId}/attempts/${attemptId}/override`, input);
}

export function listQuestions(filters: Record<string, string | boolean | undefined>): Promise<Question[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return apiGet(`/questions${query ? `?${query}` : ""}`);
}

export function getQuestion(id: string): Promise<Question> {
  return apiGet(`/questions/${id}`);
}

export function updateQuestion(
  id: string,
  input: {
    stem?: string;
    options?: string[];
    correct_option?: string;
    model_answer?: string;
    explanation?: string;
    status?: string;
    is_gold?: boolean;
    gold_status?: string;
    cognitive_level?: string;
  },
): Promise<Question> {
  return apiSend("PATCH", `/questions/${id}`, input);
}

export function archiveQuestion(id: string): Promise<Question> {
  return apiSend("POST", `/questions/${id}/archive`);
}

export function flagQuestion(id: string): Promise<Question> {
  return apiSend("POST", `/questions/${id}/flag`);
}

export function deleteQuestion(id: string): Promise<void> {
  return apiSend("DELETE", `/questions/${id}`);
}

export function listGoldQueue(subjectId?: string): Promise<Question[]> {
  const query = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : "";
  return apiGet(`/questions/gold/queue${query}`);
}

export function reviewGold(id: string, confirm: boolean): Promise<Question> {
  return apiSend("POST", `/questions/${id}/gold-review`, { confirm });
}

export function toggleGold(id: string, isGold: boolean): Promise<Question> {
  return apiSend("POST", `/questions/${id}/gold`, { is_gold: isGold });
}

export function getQuestionSettings(): Promise<QuestionSettings> {
  return apiGet("/question-settings");
}

export function updateQuestionSettings(input: QuestionSettings): Promise<QuestionSettings> {
  return apiSend("PATCH", "/question-settings", input);
}

export function listWebSearchProviders(): Promise<WebSearchProvider[]> {
  return apiGet("/web-search-providers");
}

export function createWebSearchProvider(input: {
  name: string;
  endpoint: string;
  api_key?: string | null;
}): Promise<WebSearchProvider> {
  return apiSend("POST", "/web-search-providers", input);
}

export function updateWebSearchProvider(
  id: string,
  input: {
    name?: string;
    endpoint?: string;
    api_key?: string | null;
    clear_api_key?: boolean;
  },
): Promise<WebSearchProvider> {
  return apiSend("PATCH", `/web-search-providers/${id}`, input);
}

export function deleteWebSearchProvider(id: string): Promise<void> {
  return apiSend("DELETE", `/web-search-providers/${id}`);
}

export function testWebSearchProvider(providerId: string): Promise<{ ok: boolean; message: string }> {
  return apiSend("POST", "/web-search-providers/test", { provider_id: providerId });
}

export function setDefaultWebSearchProvider(providerId: string): Promise<void> {
  return apiSend("POST", "/web-search-providers/default", { provider_id: providerId });
}

// ─── Phase 4 learning ───────────────────────────────────────────────────────

export interface StreakInfo {
  current: number;
  longest: number;
  timezone: string;
}

export interface DailyGoalProgress {
  date: string;
  answered: number;
  goal: number;
  points_earned: number;
  goal_met: boolean;
}

export interface HeatmapDay {
  date: string;
  questions_answered: number;
  points_earned: number;
  goal_met: boolean;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface MasteryRow {
  id: string;
  label: string;
  kind: string;
  retention_estimate: number;
  recent_accuracy: number;
  due_count: number;
}

export interface Dashboard {
  total_points: number;
  level: number;
  level_progress: number;
  streak: StreakInfo;
  today: DailyGoalProgress;
  due_today: number;
  heatmap: HeatmapDay[];
  accuracy_trend: TrendPoint[];
  points_trend: TrendPoint[];
  mastery: MasteryRow[];
  weakest_topics: MasteryRow[];
  recent_tests: FinalTest[];
}

export interface DueQueueItem {
  question_id: string;
  card_state: {
    id: string;
    question_id: string;
    due: string;
    stability: number;
    difficulty: number;
    state: string;
    reps: number;
    lapses: number;
    last_review: string | null;
    created_at: string;
    updated_at: string;
  };
  overdue_days: number;
}

export interface RatingThresholds {
  again_below: number;
  hard_below: number;
  good_below: number;
}

export interface PointsConfig {
  base_mcq: number;
  base_written: number;
  level_recall: number;
  level_understand: number;
  level_apply: number;
  level_analyze: number;
  gold_multiplier: number;
  streak_bonus_per_day: number;
  streak_bonus_cap: number;
  test_multiplier: number;
  same_day_repeat_multiplier: number;
}

export interface TestDefaults {
  question_count: number;
  time_limit_s: number | null;
  pass_mark: number;
  include_gold: boolean;
  feedback_timing: string;
  navigation: string;
  focus_mode: boolean;
  kind_mcq_pct: number;
  kind_written_pct: number;
}

export interface LearningSettings {
  desired_retention: number;
  daily_goal: number;
  new_questions_per_day: number;
  review_new_ratio: number;
  timezone: string;
  rating_thresholds: RatingThresholds;
  points: PointsConfig;
  streak: { daily_goal_questions: number };
  test_defaults: TestDefaults;
}

export interface LearningSettingsSources {
  desired_retention: string;
  daily_goal: string;
  new_questions_per_day: string;
  review_new_ratio: string;
  timezone: string;
  points: string;
  test_defaults: string;
}

export interface ResolvedLearningSettings {
  settings: LearningSettings;
  sources: LearningSettingsSources;
}

export interface LearningSettingsPatch {
  desired_retention?: number;
  daily_goal?: number;
  new_questions_per_day?: number;
  review_new_ratio?: number;
  timezone?: string;
  rating_thresholds?: RatingThresholds;
  points?: PointsConfig;
  test_defaults?: TestDefaults;
}

export interface PointsLedgerEntry {
  id: string;
  amount: number;
  reason: string;
  attempt_id: string | null;
  test_id: string | null;
  multiplier_breakdown: Record<string, unknown>;
  created_at: string;
}

export interface DailyActivity {
  id: string;
  date: string;
  questions_answered: number;
  points_earned: number;
  minutes_studied: number;
  goal_met: boolean;
}

export interface TestKindMix {
  mcq_pct: number;
  written_pct: number;
}

export interface TestConfig {
  subject_id: string;
  source_ids: string[];
  topic_ids: string[];
  question_count: number;
  time_limit_s: number | null;
  kinds: TestKindMix;
  cognitive_mix: QuestionSettings["cognitive_mix"];
  include_gold: boolean;
  use_existing: boolean;
  pass_mark: number;
  feedback_timing: string;
  navigation: string;
  focus_mode: boolean;
}

export interface FinalTest {
  id: string;
  subject_id: string;
  config: Record<string, unknown>;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  time_limit_s: number | null;
  score: number | null;
  pass: boolean | null;
  integrity_status: string;
  created_at: string;
  updated_at: string;
}

export interface TestDetail {
  test: FinalTest;
  questions: QuestionPublic[];
}

export interface TestAnswerResponse {
  attempt: Attempt;
  question: Question;
}

export interface IntegrityEvent {
  id: string;
  test_id: string;
  kind: string;
  at: string;
  meta: Record<string, unknown>;
}

export interface TopicBreakdown {
  topic_id: string | null;
  topic_title: string;
  answered: number;
  correct: number;
  average_score: number;
}

export interface TestQuestionResult {
  question_id: string;
  position: number;
  attempt: Attempt | null;
  question: Question;
}

export interface TestResults {
  test: FinalTest;
  score: number;
  pass: boolean;
  time_taken_s: number | null;
  per_question: TestQuestionResult[];
  topic_breakdown: TopicBreakdown[];
  integrity_timeline: IntegrityEvent[];
}

function subjectQuery(subjectId?: string): string {
  return subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : "";
}

export function getDashboard(): Promise<Dashboard> {
  return apiGet("/dashboard");
}

export function getDueQueue(subjectId?: string): Promise<DueQueueItem[]> {
  return apiGet(`/due-queue${subjectQuery(subjectId)}`);
}

export function getLearningSettings(subjectId?: string): Promise<ResolvedLearningSettings> {
  return apiGet(`/learning-settings${subjectQuery(subjectId)}`);
}

export function updateLearningSettings(
  patch: LearningSettingsPatch,
  subjectId?: string,
): Promise<ResolvedLearningSettings> {
  return apiSend("PATCH", `/learning-settings${subjectQuery(subjectId)}`, patch);
}

export function getPointsLedger(limit = 50): Promise<PointsLedgerEntry[]> {
  return apiGet(`/points-ledger?limit=${limit}`);
}

export function getStreak(): Promise<StreakInfo> {
  return apiGet("/streak");
}

export function getDailyActivity(from?: string, to?: string): Promise<DailyActivity[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return apiGet(`/daily-activity${query ? `?${query}` : ""}`);
}

export function createTest(config: TestConfig): Promise<FinalTest> {
  return apiSend("POST", "/tests", config);
}

export function listTests(subjectId?: string): Promise<FinalTest[]> {
  return apiGet(`/tests${subjectQuery(subjectId)}`);
}

export function getTest(id: string): Promise<TestDetail> {
  return apiGet(`/tests/${id}`);
}

export function startTest(id: string): Promise<FinalTest> {
  return apiSend("POST", `/tests/${id}/start`);
}

export function answerTest(
  id: string,
  input: {
    question_id: string;
    answer_text?: string;
    selected_option?: string;
    time_taken_ms?: number;
  },
): Promise<TestAnswerResponse> {
  return apiSend("POST", `/tests/${id}/answer`, input);
}

export function submitTest(id: string): Promise<FinalTest> {
  return apiSend("POST", `/tests/${id}/submit`);
}

export function expireTest(id: string): Promise<FinalTest> {
  return apiSend("POST", `/tests/${id}/expire`);
}

export function postIntegrityEvent(
  id: string,
  input: { kind: string; at?: string; meta?: Record<string, unknown> },
): Promise<IntegrityEvent> {
  return apiSend("POST", `/tests/${id}/integrity-events`, input);
}

export function getTestResults(id: string): Promise<TestResults> {
  return apiGet(`/tests/${id}/results`);
}

export async function advanceClock(input: {
  seconds?: number;
  hours?: number;
  days?: number;
}): Promise<{ now: string } | null> {
  try {
    return await apiSend("POST", "/dev/clock/advance", input);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

// ─── Phase 5 account, sync, credits, export ─────────────────────────────────

export interface UserAccount {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthSessionPublic {
  id: string;
  user_id: string;
  kind: string;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface AuthMe {
  user: UserAccount;
  sessions: AuthSessionPublic[];
}

export interface SignInResponse {
  user: UserAccount;
  session: AuthSessionPublic;
  bearer_token?: string;
}

export type SyncState = "synced" | "syncing" | "offline" | "error";

export interface SyncStatus {
  state: SyncState;
  last_sync_at: string | null;
  message: string | null;
}

export interface SyncRecord {
  table: string;
  id: string;
  user_id: string | null;
  version: number;
  updated_at: string;
  deleted_at: string | null;
  payload: Record<string, unknown>;
}

export interface SyncPullResponse {
  records: SyncRecord[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface SyncPushResponse {
  accepted: number;
  conflicts: number;
  errors: string[];
}

export interface CreditsBalance {
  balance: number;
  reserved: number;
  available: number;
}

export interface CreditsLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  kind: string;
  reference: string | null;
  created_at: string;
}

export interface ExportPayload {
  exported_at: string;
  user_id: string | null;
  subjects: Subject[];
  settings: Setting[];
  profiles: LocalProfile[];
}

export function signUp(input: { email: string; password: string }): Promise<UserAccount> {
  return apiSend("POST", "/auth/sign-up", input);
}

export async function signIn(input: { email: string; password: string }): Promise<SignInResponse> {
  const response = await apiSend<SignInResponse>("POST", "/auth/sign-in", input);
  if (response.bearer_token) setBearerToken(response.bearer_token);
  return response;
}

export async function getAuthMe(): Promise<AuthMe | null> {
  try {
    return await apiGet<AuthMe>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

export function verifyEmail(token: string): Promise<void> {
  return apiSend("POST", "/auth/verify", { token });
}

export function requestPasswordReset(email: string): Promise<void> {
  return apiSend("POST", "/auth/password-reset", { email });
}

export function confirmPasswordReset(input: { token: string; new_password: string }): Promise<void> {
  return apiSend("POST", "/auth/password-reset/confirm", input);
}

export async function authLogout(): Promise<void> {
  try {
    await apiSend("POST", "/auth/logout");
  } finally {
    setBearerToken(null);
  }
}

export function authLogoutAll(): Promise<void> {
  return apiSend("POST", "/auth/logout-all");
}

export function deleteAccount(): Promise<void> {
  return apiSend("POST", "/auth/delete-account");
}

export function linkLocalData(confirm: boolean): Promise<{ rows_linked: number }> {
  return apiSend("POST", "/auth/link-local", { confirm });
}

export function getSyncStatus(): Promise<SyncStatus> {
  return apiGet("/sync/status");
}

export function syncPull(input: {
  device_id: string;
  cursor?: string | null;
  limit?: number;
}): Promise<SyncPullResponse> {
  return apiSend("POST", "/sync/pull", {
    device_id: input.device_id,
    cursor: input.cursor ?? null,
    limit: input.limit,
  });
}

export function syncPush(input: { device_id: string; records: SyncRecord[] }): Promise<SyncPushResponse> {
  return apiSend("POST", "/sync/push", { device_id: input.device_id, records: input.records });
}

export function getCreditsBalance(): Promise<CreditsBalance> {
  return apiGet("/credits/balance");
}

export function getCreditsLedger(): Promise<CreditsLedgerEntry[]> {
  return apiGet("/credits/ledger");
}

export function topupCredits(input: { amount_credits: number; idempotency_key: string }): Promise<CreditsLedgerEntry> {
  return apiSend("POST", "/credits/topup", input);
}

export function fetchExport(): Promise<ExportPayload> {
  return apiGet("/export");
}
