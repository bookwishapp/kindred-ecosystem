'use client';

export default function DeleteButton({
  children,
  confirmMessage = 'Are you sure you want to delete this?',
  className = 'btn btn-danger btn-small'
}) {
  const handleClick = (e) => {
    if (!confirm(confirmMessage)) {
      e.preventDefault();
    }
  };

  return (
    <button
      type="submit"
      className={className}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}