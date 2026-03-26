'use client';

import { useState } from 'react';
import styles from './HomeActions.module.css';

export default function HomeActions() {
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentMode, setPaymentMode] = useState('payment'); // 'payment' or 'subscription'
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setShowConfirmation(true);
        setEmail('');
        setTimeout(() => {
          setShowConfirmation(false);
          setSubscribeOpen(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Subscribe error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupport = async () => {
    if (isSubmitting) return;

    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          mode: paymentMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Support error:', error);
      setIsSubmitting(false);
    }
  };

  const resetSupport = () => {
    setPaymentMode('payment');
    setSelectedAmount(5);
    setCustomAmount('');
  };

  const handleSubscribeToggle = (checked) => {
    setSubscribeOpen(checked);
    if (!checked) {
      setEmail('');
      setShowConfirmation(false);
    }
  };

  const handleSupportToggle = (checked) => {
    setSupportOpen(checked);
    if (!checked) {
      resetSupport();
    }
  };

  return (
    <>
      <div className={styles.actions}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={subscribeOpen}
            onChange={(e) => handleSubscribeToggle(e.target.checked)}
          />
          <span>Keep Small Things</span>
        </label>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={supportOpen}
            onChange={(e) => handleSupportToggle(e.target.checked)}
          />
          <span>Support Small Things</span>
        </label>
      </div>

      {/* Subscribe Modal */}
      {subscribeOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSubscribeOpen(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            {showConfirmation ? (
              <div className={styles.confirmation}>
                <p>You're in.</p>
              </div>
            ) : (
              <>
                <h2>Keep Small Things</h2>
                <p className={styles.bodyCopy}>
                  A letter, most weeks. No algorithm. No ads.
                </p>
                <form onSubmit={handleSubscribe} className={styles.subscribeForm}>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className={styles.emailInput}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.submitButton}
                  >
                    {isSubmitting ? 'Sending...' : 'Keep it'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Support Modal */}
      {supportOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSupportOpen(false)}
        >
          <div
            className={`${styles.modal} ${styles.supportModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Support Small Things</h2>
            <p className={styles.bodyCopy}>
              Writing takes time. Your support keeps it going.
            </p>

            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeButton} ${paymentMode === 'payment' ? styles.active : ''}`}
                onClick={() => setPaymentMode('payment')}
                type="button"
              >
                Once
              </button>
              <button
                className={`${styles.modeButton} ${paymentMode === 'subscription' ? styles.active : ''}`}
                onClick={() => setPaymentMode('subscription')}
                type="button"
              >
                Monthly
              </button>
            </div>

            <div className={styles.amountGrid}>
              {[3, 5, 10, 25].map((amount) => (
                <button
                  key={amount}
                  className={`${styles.amountButton} ${selectedAmount === amount && !customAmount ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  type="button"
                >
                  ${amount}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(0);
              }}
              min="1"
              className={styles.customAmountInput}
            />

            <button
              onClick={handleSupport}
              disabled={isSubmitting || (!selectedAmount && !customAmount)}
              className={`${styles.submitButton} ${styles.supportButton}`}
            >
              {isSubmitting ? 'Processing...' : 'Support'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}