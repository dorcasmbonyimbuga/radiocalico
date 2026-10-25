// Live stream player (HLS.js, or native HLS on Safari / iOS)
const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';

export function initPlayer({ audio, button, icon, badge, status, volume }, streamUrl) {
  let hls = null;

  const setStatus = (text) => { status.textContent = text; };

  function setPlaying(playing) {
    icon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    button.setAttribute('aria-label', playing ? 'Pause' : 'Play live stream');
    badge.classList.toggle('on', playing);
  }

  function play() {
    audio.play().catch(() => setStatus('Playback blocked by the browser'));
  }

  function start() {
    setStatus('Connecting to stream…');
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ liveDurationInfinity: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, play);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setStatus('Network issue, retrying…');
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setStatus('Stream unavailable');
          stop();
        }
      });
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = streamUrl;
      play();
    } else {
      setStatus('HLS is not supported by this browser');
    }
  }

  function stop() {
    audio.pause();
    if (hls) { hls.destroy(); hls = null; }
    audio.removeAttribute('src');
    audio.load();
    setPlaying(false);
  }

  button.addEventListener('click', () => {
    if (!streamUrl) return setStatus('Stream not configured');
    // For a live stream, reconnect on every play instead of resuming behind live
    if (audio.paused) start();
    else { stop(); setStatus('Paused'); }
  });

  audio.addEventListener('playing', () => { setPlaying(true); setStatus('You are listening to Radio Calico'); });
  audio.addEventListener('waiting', () => setStatus('Buffering…'));
  audio.volume = Number(volume.value);
  volume.addEventListener('input', () => { audio.volume = Number(volume.value); });
}
