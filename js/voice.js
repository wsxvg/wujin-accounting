// 语音识别模块
// 使用 Web Speech API（浏览器原生，iPhone Safari 支持）

const VoiceRecognition = (() => {
  let recognition = null;
  let isRecording = false;
  let currentCallback = null;
  let currentBtn = null;
  let hasEnded = false; // 防止 onend/onerror 重复触发

  function isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

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
      if (hasEnded) return;
      hasEnded = true;

      // 根据错误类型显示不同提示
      switch (event.error) {
        case 'not-allowed':
          showToast('请在iPhone设置中允许麦克风权限', true);
          break;
        case 'network':
          showToast('网络连接失败，请检查网络', true);
          break;
        case 'no-speech':
          showToast('没有检测到语音，请靠近手机再说一次', true);
          break;
        case 'audio-capture':
          showToast('没有找到麦克风，请检查设备', true);
          break;
        case 'service-not-allowed':
          showToast('语音服务不可用，请检查Siri设置', true);
          break;
        case 'aborted':
          // 用户主动取消，不显示错误
          break;
        default:
          showToast(`语音识别出错：${event.error}`, true);
      }

      stopRecording();
    };

    recognition.onend = () => {
      if (hasEnded) return;
      hasEnded = true;
      stopRecording();
    };

    return true;
  }

  async function startRecording(callback, btnElement) {
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

    // iOS Safari: 需要先请求麦克风权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // 立即释放，只是测试权限
    } catch (e) {
      console.error('麦克风权限被拒绝:', e);
      showToast('请在浏览器弹窗中允许使用麦克风', true);
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

      showToast('正在听，请说话...');
    } catch (e) {
      console.error('启动语音识别失败:', e);
      showToast('启动失败，请重试', true);
      stopRecording();
    }
  }

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
