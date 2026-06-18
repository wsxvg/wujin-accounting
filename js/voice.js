// 语音识别模块
// 使用 Web Speech API（浏览器原生，iPhone Safari 支持）

const VoiceRecognition = (() => {
  let recognition = null;
  let isRecording = false;
  let currentCallback = null;
  let currentBtn = null;
  let currentInput = null; // 要填入的输入框
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
    recognition.continuous = true;      // 持续识别，不自动停止
    recognition.interimResults = true;   // 开启实时中间结果
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (hasEnded) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // 实时更新输入框显示识别中的文字
      if (currentInput && (interimTranscript || finalTranscript)) {
        const displayText = finalTranscript || interimTranscript;
        currentInput.value = displayText;
        // 实时文字用不同样式标记
        if (interimTranscript && !finalTranscript) {
          currentInput.style.opacity = '0.7';
        } else {
          currentInput.style.opacity = '1';
        }
      }

      // 有最终结果时回调
      if (finalTranscript) {
        console.log('语音识别最终结果:', finalTranscript);
        showToast(`✓ ${finalTranscript}`);
        if (currentCallback) {
          currentCallback(finalTranscript);
        }
        hasEnded = true;
        clearTimeout(timeoutTimer);
        stopRecording();
      }
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      if (hasEnded) return;
      hasEnded = true;
      clearTimeout(timeoutTimer);

      switch (event.error) {
        case 'not-allowed':
          showToast('请点击地址栏的麦克风图标，允许使用麦克风', true);
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
          showToast('请在设置→Siri与搜索中开启Siri', true);
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
      if (isRecording) {
        showToast('识别结束，请检查文字是否正确');
      }
      stopRecording();
    };

    return true;
  }

  function startRecording(callback, btnElement, inputElement) {
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
    currentInput = inputElement || null;
    hasEnded = false;

    try {
      recognition.start();
      isRecording = true;

      if (currentBtn) {
        currentBtn.classList.add('recording');
      }
      if (currentInput) {
        currentInput.value = '';
        currentInput.classList.add('voice-active');
        currentInput.placeholder = '🎤 正在听，请说话...';
      }

      // 超时检测：15秒没有最终结果自动停止
      timeoutTimer = setTimeout(() => {
        if (isRecording && !hasEnded) {
          hasEnded = true;
          showToast('识别超时，请重试');
          stopRecording();
        }
      }, 15000);

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
      } catch (e) {}
    }

    isRecording = false;

    if (currentBtn) {
      currentBtn.classList.remove('recording');
      currentBtn = null;
    }

    if (currentInput) {
      currentInput.style.opacity = '1';
      currentInput.classList.remove('voice-active');
      currentInput.placeholder = '输入商品名称，或点击麦克风语音输入';
      currentInput = null;
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
