// 百度语音识别模块
// 使用百度短语音识别极速版API

const BaiduSpeech = (() => {
  const API_KEY = 'ICp734U0NHdQEM9Q1WFzV0Yo';
  const SECRET_KEY = 'tqaOOttXX6hTKZpfzQlQXNFWTkFkV56J';
  const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
  const API_URL = 'https://vop.baidu.com/pro_api';
  const CORS_PROXY = 'https://corsproxy.io/?';

  // 从 localStorage 缓存 token（有效期30天）
  function getCachedToken() {
    try {
      const cached = JSON.parse(localStorage.getItem('baidu_token') || '{}');
      if (cached.token && cached.expires > Date.now()) {
        return cached.token;
      }
    } catch (e) {}
    return null;
  }

  function cacheToken(token, expiresIn) {
    localStorage.setItem('baidu_token', JSON.stringify({
      token: token,
      expires: Date.now() + (expiresIn - 300) * 1000 // 提前5分钟过期
    }));
  }

  // 获取 access_token
  async function getAccessToken() {
    const cached = getCachedToken();
    if (cached) return cached;

    const url = `${CORS_PROXY}${TOKEN_URL}?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.access_token) {
      cacheToken(data.access_token, data.expires_in);
      return data.access_token;
    }

    throw new Error('获取token失败: ' + (data.error_description || '未知错误'));
  }

  // 识别音频
  async function recognize(audioBlob) {
    const token = await getAccessToken();

    // 转为 base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // 确定音频格式
    let format = 'm4a';
    if (audioBlob.type.includes('webm')) format = 'wav';
    if (audioBlob.type.includes('wav')) format = 'wav';

    const body = {
      format: format,
      rate: 16000,
      channel: 1,
      dev_pid: 80001, // 极速版输入法模型
      cuid: 'wujin-pwa-' + navigator.userAgent.length,
      token: token,
      len: arrayBuffer.byteLength,
      speech: base64
    };

    const response = await fetch(`${CORS_PROXY}${API_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.err_no === 0 && data.result && data.result.length > 0) {
      return data.result[0];
    }

    throw new Error('识别失败: ' + (data.err_msg || 'err_no=' + data.err_no));
  }

  return { recognize, getAccessToken };
})();
