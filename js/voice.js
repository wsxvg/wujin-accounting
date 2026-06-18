// 语音识别模块
// 优先使用百度API，失败后降级到Web Speech API

const VoiceRecognition = (() => {
  let isRecording = false;
  let currentCallback = null;
  let currentBtn = null;
  let currentInput = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let hasResult = false;
  let timeoutTimer = null;

  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  function isSupported() {
    return hasMediaRecorder || hasWebSpeech;
  }

  // ====== 主入口：开始录音 ======
  async function startRecording(callback, btnElement, inputElement) {
    if (isRecording) {
      stopRecording();
      return;
    }

    currentCallback = callback;
    currentBtn = btnElement;
    currentInput = inputElement || null;
    hasResult = false;

    // 优先用 MediaRecorder 录音（给百度API用）
    if (hasMediaRecorder) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 选择支持的格式
        let mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm;codecs=opus';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // 让浏览器选择默认格式
        }

        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.start();
        isRecording = true;
        updateUI('recording');
        showToast('🎤 正在录音，请说话...');

        // 15秒超时
        timeoutTimer = setTimeout(() => {
          if (isRecording) stopRecording();
        }, 15000);

      } catch (e) {
        console.error('麦克风访问失败:', e);
        // 降级到 Web Speech API
        if (hasWebSpeech) {
          startWebSpeech();
        } else {
          showToast('请允许使用麦克风权限', true);
        }
      }
    } else if (hasWebSpeech) {
      startWebSpeech();
    } else {
      showToast('您的浏览器不支持语音输入', true);
    }
  }

  // ====== 停止录音并识别 ======
  async function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    clearTimeout(timeoutTimer);

    updateUI('processing');
    showToast('正在识别...');

    // 停止 MediaRecorder 并获取音频
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      const audioBlob = await new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
          audioChunks = [];
          // 释放麦克风
          mediaRecorder.stream.getTracks().forEach(t => t.stop());
          resolve(blob);
        };
        mediaRecorder.stop();
      });

      // 尝试百度API识别
      try {
        const result = await BaiduSpeech.recognize(audioBlob);
        if (result && !hasResult) {
          hasResult = true;
          applyResult(result);
          return;
        }
      } catch (e) {
        console.warn('百度识别失败，降级到Web Speech:', e.message);
      }
    }

    // 百度失败或不可用，降级到 Web Speech API
    if (hasWebSpeech && !hasResult) {
      showToast('正在使用备选方案识别...');
      startWebSpeech();
    } else if (!hasResult) {
      updateUI('idle');
      showToast('识别失败，请手动输入', true);
    }
  }

  // ====== Web Speech API（备选方案） ======
  let webSpeechRec = null;

  function startWebSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    webSpeechRec = new SpeechRecognition();
    webSpeechRec.lang = 'zh-CN';
    webSpeechRec.continuous = false;
    webSpeechRec.interimResults = false;
    webSpeechRec.maxAlternatives = 1;

    webSpeechRec.onresult = (event) => {
      if (hasResult) return;
      hasResult = true;
      const transcript = event.results[0][0].transcript;
      applyResult(transcript);
    };

    webSpeechRec.onerror = (event) => {
      console.error('Web Speech 错误:', event.error);
      if (hasResult) return;
      hasResult = true;
      updateUI('idle');

      if (event.error === 'not-allowed') {
        showToast('请允许使用麦克风权限', true);
      } else if (event.error === 'no-speech') {
        showToast('没有检测到语音，请重试', true);
      } else {
        showToast('语音识别失败，请手动输入', true);
      }
    };

    webSpeechRec.onend = () => {
      if (!hasResult) {
        hasResult = true;
        updateUI('idle');
        showToast('没有识别到语音，请重试');
      }
    };

    try {
      isRecording = true;
      webSpeechRec.start();
      updateUI('recording');
      showToast('🎤 正在听，请说话...');

      // 10秒超时
      timeoutTimer = setTimeout(() => {
        if (isRecording && webSpeechRec) {
          try { webSpeechRec.stop(); } catch (e) {}
        }
      }, 10000);

    } catch (e) {
      console.error('Web Speech 启动失败:', e);
      updateUI('idle');
      showToast('语音识别启动失败', true);
    }
  }

  // ====== 应用识别结果 ======
  function applyResult(text) {
    updateUI('idle');
    showToast(`✓ ${text}`);

    if (currentInput) {
      currentInput.value = text;
      currentInput.style.opacity = '1';
      currentInput.classList.remove('voice-active');
      currentInput.placeholder = '输入商品名称，或点击麦克风语音输入';
    }

    if (currentCallback) {
      currentCallback(text);
    }
  }

  // ====== UI 更新 ======
  function updateUI(state) {
    if (currentBtn) {
      if (state === 'recording') {
        currentBtn.classList.add('recording');
      } else {
        currentBtn.classList.remove('recording');
      }
    }

    if (currentInput) {
      if (state === 'recording') {
        currentInput.classList.add('voice-active');
        currentInput.placeholder = '🎤 正在录音...';
      } else if (state === 'processing') {
        currentInput.classList.add('voice-active');
        currentInput.placeholder = '正在识别...';
      } else {
        currentInput.classList.remove('voice-active');
        currentInput.placeholder = '输入商品名称，或点击麦克风语音输入';
      }
    }
  }

  return {
    isSupported,
    startRecording,
    stopRecording,
    get isRecording() { return isRecording; }
  };
})();
