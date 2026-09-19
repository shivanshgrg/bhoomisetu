import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { repository } from '../data';
import {
  ACQUISITION_STAGES,
  CHAT_TOPICS,
  getAdvanceGate,
  getParcelCalculatedStatus,
  getRequiredDocumentKinds,
  matchChatStage,
  matchChatTopic,
  type ChatTopicId,
  type DashboardStatus,
  type StageId,
} from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import {
  chatbotStageDescriptions,
  chatbotStatusMeaningDescriptions,
  chatbotTopicLabels,
  dashboardStatusLabels,
  documentKindLabels,
  stageLabels,
  uiText,
} from '../i18n/translations';
import { getAdvanceGateReasonText, getStatusIcon } from '../pages/statusDisplay';
import { VoiceInputButton } from './VoiceInputButton';
import { Button } from './ui';

type ChatMode = 'menu' | 'documents' | 'awaitingSurvey';

type ChatMessage = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  linkTo?: string;
  linkLabel?: string;
};

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

const STATUS_MEANING_ORDER: DashboardStatus[] = ['ready_to_advance', 'on_track', 'stuck', 'blocked', 'complete'];

export function LandownerChatbot() {
  const { language, t } = useLanguage();
  const { session } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>('menu');
  const [inputValue, setInputValue] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Conversation strings are language-specific. Resetting the short demo
    // helper when language changes avoids a mixed-language transcript.
    setMessages([
      { id: nextMessageId(), sender: 'bot', text: t(uiText.chatbot.greeting) },
      { id: nextMessageId(), sender: 'bot', text: t(uiText.chatbot.menuPrompt) },
    ]);
    setMode('menu');
    setInputValue('');
  }, [language, t]);

  useEffect(() => {
    if (isOpen) {
      transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
    }
  }, [messages, isOpen]);

  if (!session || session.role !== 'landowner' || !session.user) {
    return null;
  }

  function addBotMessage(text: string, link?: { to: string; label: string }) {
    setMessages((prev) => [
      ...prev,
      { id: nextMessageId(), sender: 'bot', text, linkTo: link?.to, linkLabel: link?.label },
    ]);
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: nextMessageId(), sender: 'user', text }]);
  }

  function respondToTopic(topicId: ChatTopicId) {
    switch (topicId) {
      case 'status': {
        addBotMessage(t(uiText.chatbot.statusPrompt));
        setMode('awaitingSurvey');
        return;
      }
      case 'stages': {
        const lines = ACQUISITION_STAGES.map(
          (stage, index) =>
            `${index + 1}. ${t(stageLabels[stage.id])} — ${t(chatbotStageDescriptions[stage.id])}`,
        ).join('\n');
        addBotMessage(`${t(uiText.chatbot.stagesIntro)}\n\n${lines}`);
        setMode('menu');
        return;
      }
      case 'documents': {
        addBotMessage(t(uiText.chatbot.documentsIntro));
        setMode('documents');
        return;
      }
      case 'objection': {
        addBotMessage(t(uiText.chatbot.objectionAnswer));
        setMode('menu');
        return;
      }
      case 'compensation': {
        addBotMessage(t(uiText.chatbot.compensationAnswer));
        setMode('menu');
        return;
      }
      case 'statusMeaning': {
        const lines = STATUS_MEANING_ORDER.map(
          (status) =>
            `${getStatusIcon(status)} ${t(dashboardStatusLabels[status])} — ${t(chatbotStatusMeaningDescriptions[status])}`,
        ).join('\n');
        addBotMessage(`${t(uiText.chatbot.statusMeaningIntro)}\n\n${lines}`);
        setMode('menu');
        return;
      }
      case 'language': {
        addBotMessage(t(uiText.chatbot.languageAnswer));
        setMode('menu');
        return;
      }
      case 'contact': {
        addBotMessage(t(uiText.chatbot.contactAnswer));
        setMode('menu');
        return;
      }
      case 'about': {
        addBotMessage(t(uiText.chatbot.aboutAnswer));
        setMode('menu');
        return;
      }
      default:
        return;
    }
  }

  function handleTopicButtonClick(topicId: ChatTopicId) {
    addUserMessage(t(chatbotTopicLabels[topicId]));
    respondToTopic(topicId);
  }

  function respondToStage(stageId: StageId) {
    const docs = getRequiredDocumentKinds(stageId)
      .map((kind) => t(documentKindLabels[kind]))
      .join(', ');
    addBotMessage(`${t(uiText.chatbot.documentsResultPrefix)} ${t(stageLabels[stageId])}: ${docs}.`);
    setMode('documents');
  }

  function handleStageButtonClick(stageId: StageId) {
    addUserMessage(t(stageLabels[stageId]));
    respondToStage(stageId);
  }

  function handleBackToMenu() {
    addUserMessage(t(uiText.chatbot.backToMenuButton));
    addBotMessage(t(uiText.chatbot.menuPrompt));
    setMode('menu');
  }

  function handleRestart() {
    setMessages([
      { id: nextMessageId(), sender: 'bot', text: t(uiText.chatbot.greeting) },
      { id: nextMessageId(), sender: 'bot', text: t(uiText.chatbot.menuPrompt) },
    ]);
    setMode('menu');
    setInputValue('');
  }

  async function lookupSurveyNumber(surveyNumberRaw: string) {
    setIsLookingUp(true);
    try {
      const parcel = await repository.getParcelBySurveyNumber(surveyNumberRaw);
      if (!parcel) {
        addBotMessage(
          `${t(uiText.chatbot.statusNotFoundPrefix)} ${surveyNumberRaw}${t(uiText.chatbot.statusNotFoundSuffix)}`,
        );
        setMode('menu');
        return;
      }

      const calculatedStatus = getParcelCalculatedStatus(parcel);
      const advanceGate = getAdvanceGate(parcel);
      const stageLabel = t(stageLabels[parcel.currentStage]);
      const statusLabel = t(dashboardStatusLabels[calculatedStatus.status]);
      const actionText = getAdvanceGateReasonText(parcel.currentStage, calculatedStatus, advanceGate, t);

      const summary = [
        `${t(uiText.chatbot.statusFoundIntro)} ${parcel.surveyNumber}:`,
        `${getStatusIcon(calculatedStatus.status)} ${t(uiText.landownerStatus.status)}: ${statusLabel}`,
        `${t(uiText.landownerStatus.currentStage)}: ${stageLabel}`,
        `${t(uiText.landownerStatus.actionRequired)}: ${actionText}`,
      ].join('\n');

      addBotMessage(summary, {
        to: `/landowner/status/${parcel.id}`,
        label: t(uiText.chatbot.statusViewFullButton),
      });
      setMode('menu');
    } catch {
      addBotMessage(t(uiText.chatbot.statusLookupError));
      setMode('menu');
    } finally {
      setIsLookingUp(false);
    }
  }

  function handleSubmit(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return;
    }
    addUserMessage(trimmed);
    setInputValue('');

    if (mode === 'awaitingSurvey') {
      void lookupSurveyNumber(trimmed);
      return;
    }

    if (mode === 'documents') {
      const stageId = matchChatStage(trimmed);
      if (stageId) {
        respondToStage(stageId);
        return;
      }
      const topicId = matchChatTopic(trimmed);
      if (topicId) {
        respondToTopic(topicId);
        return;
      }
      addBotMessage(t(uiText.chatbot.documentsPickStageReminder));
      return;
    }

    const topicId = matchChatTopic(trimmed);
    if (topicId) {
      respondToTopic(topicId);
    } else {
      addBotMessage(t(uiText.chatbot.fallbackMessage));
    }
  }

  return (
    <div className="chatbot-root">
      {isOpen && (
        <section className="chatbot-panel" key={language} role="dialog" aria-label={t(uiText.chatbot.title)}>
          <header className="chatbot-panel-header">
            <div>
              <p className="chatbot-panel-title">{t(uiText.chatbot.title)}</p>
              <p className="chatbot-panel-subtitle">{t(uiText.chatbot.subtitle)}</p>
            </div>
            <div className="chatbot-panel-header-actions">
              <button type="button" className="chatbot-icon-btn" onClick={handleRestart} title={t(uiText.chatbot.restartButton)}>
                <span aria-hidden="true">↺</span>
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                onClick={() => setIsOpen(false)}
                aria-label={t(uiText.chatbot.closeLabel)}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </header>

          <div className="chatbot-transcript" ref={transcriptRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.sender === 'bot' ? 'chatbot-message chatbot-message-bot' : 'chatbot-message chatbot-message-user'}
              >
                <p>{message.text}</p>
                {message.linkTo && message.linkLabel && (
                  <Link className="chatbot-link-btn" to={message.linkTo} onClick={() => setIsOpen(false)}>
                    {message.linkLabel}
                  </Link>
                )}
              </div>
            ))}
            {isLookingUp && (
              <div className="chatbot-message chatbot-message-bot">
                <p>…</p>
              </div>
            )}
          </div>

          <div className="chatbot-options">
            {mode === 'menu' &&
              CHAT_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  className="chatbot-topic-btn"
                  onClick={() => handleTopicButtonClick(topic.id)}
                >
                  <span aria-hidden="true">{topic.icon}</span> {t(chatbotTopicLabels[topic.id])}
                </button>
              ))}
            {mode === 'documents' && (
              <>
                {ACQUISITION_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    className="chatbot-topic-btn"
                    onClick={() => handleStageButtonClick(stage.id)}
                  >
                    {t(stageLabels[stage.id])}
                  </button>
                ))}
                <button type="button" className="chatbot-topic-btn chatbot-topic-btn-back" onClick={handleBackToMenu}>
                  {t(uiText.chatbot.backToMenuButton)}
                </button>
              </>
            )}
            {mode === 'awaitingSurvey' && (
              <button type="button" className="chatbot-topic-btn chatbot-topic-btn-back" onClick={handleBackToMenu}>
                {t(uiText.chatbot.backToMenuButton)}
              </button>
            )}
          </div>

          <form
            className="chatbot-composer"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit(inputValue);
            }}
          >
            <input
              type="text"
              className="chatbot-composer-input"
              placeholder={t(uiText.chatbot.inputPlaceholder)}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
            <VoiceInputButton onResult={(transcript) => handleSubmit(transcript)} speakLabel={t(uiText.chatbot.micButton)} />
            <Button type="submit" disabled={!inputValue.trim() || isLookingUp}>
              {t(uiText.chatbot.sendButton)}
            </Button>
          </form>
        </section>
      )}

      <div className="chatbot-launcher">
        {!isOpen && <span className="chatbot-help-bubble">{t(uiText.chatbot.needHelpLabel)}</span>}
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? t(uiText.chatbot.closeLabel) : t(uiText.chatbot.openLabel)}
        >
          <span aria-hidden="true">{isOpen ? '✕' : '💬'}</span>
        </button>
      </div>
    </div>
  );
}
