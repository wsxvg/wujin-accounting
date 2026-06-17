// 语音识别模块
// 使用 Web Speech API（浏览器原生，iPhone Safari 支持）

const VoiceRecognition = (() => {
  let recognition = null;
  let isRecording = false;
  let currentCallback = null;
  let currentBtn = null;

  // 检查浏览器是否支持
  function isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  // 初始化
  function init() {
    if (!isSupported()) {
      console.warn('当前浏览器不支持语音识别');
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('语音识别结果:', transcript);
      if (currentCallback) {
        currentCallback(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      stopRecording();
      if (event.error === 'not-allowed') {
        showToast('请允许使用麦克风权限', true);
      } else if (event.error === 'no-speech') {
        showToast('没有检测到语音，请重试', true);
      } else {
        showToast('语音识别失败，请重试', true);
      }
    };

    recognition.onend = () => {
      stopRecording();
    };

    return true;
  }

  // 开始录音
  function startRecording(callback, btnElement) {
    if (!recognition) {
      if (!init()) {
        showToast('您的浏览器不支持语音识别', true);
        return;
      }
    }

    // 如果正在录音，先停止
    if (isRecording) {
      stopRecording();
      return;
    }

    currentCallback = callback;
    currentBtn = btnElement;

    try {
      recognition.start();
      isRecording = true;

      // 更新按钮状态
      if (currentBtn) {
        currentBtn.classList.add('recording');
      }

      showToast('正在听...');
    } catch (e) {
      console.error('启动语音识别失败:', e);
      showToast('语音识别启动失败，请重试', true);
    }
  }

  // 停止录音
  function stopRecording() {
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
