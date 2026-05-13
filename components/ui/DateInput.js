function openDatePicker(event) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== 'function') return;

  try {
    input.showPicker();
  } catch {
    // Some browsers only allow this during direct user gestures.
  }
}

export default function DateInput({ className = '', onKeyDown, ...props }) {
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      openDatePicker(event);
    }
    onKeyDown?.(event);
  }

  return (
    <input
      {...props}
      type="date"
      className={`${className} cursor-pointer`}
      onClick={openDatePicker}
      onFocus={openDatePicker}
      onKeyDown={handleKeyDown}
    />
  );
}
