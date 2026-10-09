/** Local account policy: ASCII letters/digits/underscore; passwords allow visible ASCII symbols. */
export const usernameCharacters = /^[A-Za-z0-9_]*$/;
export const passwordCharacters = /^[\x21-\x7E]*$/;
export const MAX_PASSWORD_LENGTH = 64;
export const validUsername = (value: string): boolean => /^[A-Za-z0-9_]{3,16}$/.test(value);
export const validPasswordCharacters = (value: string): boolean => passwordCharacters.test(value);

/** Reject invalid edits atomically, including paste and IME; never silently alter a password. */
export function restrictInput(input: HTMLInputElement, allowed: RegExp, onRejected: () => void, onTooLong: () => void = onRejected): void {
  let previous = allowed.test(input.value) ? input.value : '';
  let selection = [previous.length, previous.length];
  let composing = false;
  const rememberSelection = () => { selection = [input.selectionStart ?? previous.length, input.selectionEnd ?? previous.length]; };
  input.addEventListener('beforeinput', rememberSelection);
  const check = () => {
    const tooLong = input.maxLength >= 0 && input.value.length > input.maxLength;
    if (allowed.test(input.value) && !tooLong) {
      previous = input.value;
      rememberSelection();
      input.removeAttribute('aria-invalid');
    } else {
      input.value = previous;
      input.setSelectionRange(Math.min(selection[0], previous.length), Math.min(selection[1], previous.length));
      if (tooLong) onTooLong(); else onRejected();
    }
  };
  input.addEventListener('compositionstart', () => { composing = true; rememberSelection(); });
  input.addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text');
    if (text === undefined) return;
    const length = input.value.length - ((input.selectionEnd ?? 0) - (input.selectionStart ?? 0)) + text.length;
    if (input.maxLength >= 0 && length > input.maxLength) {
      event.preventDefault();
      onTooLong();
    }
  });
  input.addEventListener('compositionend', () => { composing = false; check(); });
  input.addEventListener('input', event => { if (!composing && !(event as InputEvent).isComposing) check(); });
  input.addEventListener('change', check);
}
