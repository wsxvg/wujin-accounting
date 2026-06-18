// 语音识别模块
// 使用 Web Speech API（浏览器原生，iPhone Safari 支持）

const VoiceRecognition = (() => {
  let recognition = null;
  let isRecording = false;
  let currentCallback = null;
  let currentBtn = null;
  let hasEnded = false;
  let timeoutTimer = null;

  function isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  function init() {
    if (!isSupported()) return false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (hasEnded) return;
      hasEnded = true;
      clearTimeout(timeoutTimer);

      const transcript = event.results[0][0].transcript;
      console.log('语音识别结果:', transcript);
      showToast(`识别到：${transcript}`);

      if (currentCallback) {
        currentCallback(transcript);
      }
      stopRecording();
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      if (hasEnded) return;
      hasEnded = true;
      clearTimeout(timeoutTimer);

      switch (event.error) {
        case 'not-allowed':
          showToast('请点击Safari地址栏的麦克风图标，允许使用麦克风', true);
          break;
        case 'network':
          showToast('网络连接失败，请检查网络后重试', true);
          break;
        case 'no-speech':
          showToast('没有听到声音，请靠近手机再试', true);
          break;
        case 'audio-capture':
          showToast('麦克风被占用，请关闭其他录音应用', true);
          break;
        case 'service-not-allowed':
          showToast('请在iPhone设置→Siri与搜索中开启Siri', true);
          break;
        case 'aborted':
          break;
        default:
          showToast(`识别出错：${event.error}`, true);
      }
      stopRecording();
    };

    recognition.onend = () => {
      if (hasEnded) return;
      hasEnded = true;
      clearTimeout(timeoutTimer);
      // 没有结果也没有错误，可能是静音超时
      if (isRecording) {
        showToast('没有检测到语音，请再试一次');
      }
      stopRecording();
    };

    return true;
  }

  function startRecording(callback, btnElement) {
    if (!recognition) {
      if (!init()) {
        showToast('您的浏览器不支持语音识别', true);
        return;
      }
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    currentCallback = callback;
    currentBtn = btnElement;
    hasEnded = false;

    try {
      recognition.start();
      isRecording = true;

      if (currentBtn) {
        currentBtn.classList.add('recording');
      }

      showToast('🎤 正在听，请说话...');

      // 超时检测：10秒没有结果自动停止
      timeoutTimer = setTimeout(() => {
        if (isRecording && !hasEnded) {
          hasEnded = true;
          showToast('识别超时，请重试');
          stopRecording();
        }
      }, 10000);

    } catch (e) {
      console.error('启动语音识别失败:', e);
      showToast('启动失败，请重试', true);
      stopRecording();
    }
  }

  function stopRecording() {
    clearTimeout(timeoutTimer);

    if (recognition && isRecording) {
      try {
        recognition.stop();
      } catch (e) {
        // 忽略
      }
    }

    isRecording = false;

    if (currentBtn) {
      currentBtn.classList.remove('recording');
      currentBtn = null;
    }

    currentCallback = null;
  }

  return {
    isSupported,
    init,
    startRecording,
    stopRecording,
    get isRecording() { return isRecording; }
  };
})();
