// Thumbs up / thumbs down voting on the current song
import { fetchRating, sendVote } from './api.js';

const FEEDBACK_MS = 3000;

export function initRating(el) {
  let songId = null;
  let rating = null;
  let pending = false;
  let feedbackTimer = null;

  function summaryText({ up, down }) {
    const total = up + down;
    if (total === 0) return 'No votes yet. Be the first!';
    const pct = Math.round((up / total) * 100);
    return `${pct}% of listeners like this song · ${total} vote${total > 1 ? 's' : ''}`;
  }

  function render() {
    if (!rating) return;
    el.upCount.textContent = rating.up;
    el.downCount.textContent = rating.down;
    el.up.setAttribute('aria-pressed', rating.myVote === 1);
    el.down.setAttribute('aria-pressed', rating.myVote === -1);
    const total = rating.up + rating.down;
    el.approval.style.width = total ? `${(rating.up / total) * 100}%` : '0';
    el.approval.parentElement.hidden = total === 0;
    if (!feedbackTimer) el.feedback.textContent = summaryText(rating);
  }

  function flash(message) {
    clearTimeout(feedbackTimer);
    el.feedback.textContent = message;
    feedbackTimer = setTimeout(() => { feedbackTimer = null; render(); }, FEEDBACK_MS);
  }

  function setDisabled(disabled) {
    el.up.disabled = el.down.disabled = disabled;
  }

  async function load() {
    if (songId === null || pending) return;
    const id = songId;
    try {
      const data = await fetchRating(id);
      if (id === songId) { rating = data; render(); }
    } catch {
      el.feedback.textContent = 'Ratings unavailable';
    }
  }

  async function vote(value) {
    if (songId === null || pending) return;
    // Clicking the same thumb again removes the vote
    const next = rating?.myVote === value ? 0 : value;
    pending = true;
    setDisabled(true);
    try {
      rating = await sendVote(songId, next);
      render();
      flash(next === 0 ? 'Vote removed' : next === 1 ? 'Thanks! Glad you like this song.' : 'Thanks, your feedback has been noted.');
    } catch (err) {
      const messages = {
        409: 'This song just ended. Vote for the next one!',
        429: 'You are voting too fast. Please wait a moment.',
      };
      flash(messages[err.status] ?? 'Could not save your vote. Please try again.');
    } finally {
      pending = false;
      setDisabled(false);
    }
  }

  el.up.addEventListener('click', () => vote(1));
  el.down.addEventListener('click', () => vote(-1));

  return {
    // Called on every "Now Playing" sync
    update(id) {
      if (id !== songId) {
        songId = id;
        rating = null;
        clearTimeout(feedbackTimer);
        feedbackTimer = null;
        setDisabled(false);
      }
      load();
    },
  };
}
