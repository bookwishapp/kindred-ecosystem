'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './support.module.css';

export default function SupportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('payment');

  const handleSupport = async (e) => {
    e.preventDefault();

    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount <= 0) return;

    setIsLoading(true);

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
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Support error:', error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <h1 className="site-title">Small Things</h1>
        <p className="site-author">Terry Heath</p>
        <nav className="site-nav">
          <Link href="/">Letters</Link>
          <Link href="/about">About</Link>
        </nav>
      </header>

      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>Support Small Things</h1>
          <p className={styles.description}>
            Writing takes time. Your support keeps it going.
          </p>

        <form onSubmit={handleSupport} className={styles.form}>
          {/* Payment Mode Toggle */}
          <div className={styles.modeSection}>
            <h3 className={styles.sectionTitle}>Choose your support type</h3>
            <div className={styles.modeToggle}>
              <label className={`${styles.modeOption} ${paymentMode === 'payment' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  value="payment"
                  checked={paymentMode === 'payment'}
                  onChange={(e) => setPaymentMode(e.target.value)}
                />
                <span>One time</span>
              </label>
              <label className={`${styles.modeOption} ${paymentMode === 'subscription' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  value="subscription"
                  checked={paymentMode === 'subscription'}
                  onChange={(e) => setPaymentMode(e.target.value)}
                />
                <span>Monthly</span>
              </label>
            </div>
          </div>

          {/* Amount Selection */}
          <div className={styles.amountSection}>
            <h3 className={styles.sectionTitle}>Select an amount</h3>
            <div className={styles.amountGrid}>
              {[3, 5, 10, 25].map((amount) => (
                <label
                  key={amount}
                  className={`${styles.amountOption} ${selectedAmount === amount && !customAmount ? styles.active : ''}`}
                >
                  <input
                    type="radio"
                    name="amount"
                    value={amount}
                    checked={selectedAmount === amount && !customAmount}
                    onChange={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                  />
                  <span>${amount}</span>
                </label>
              ))}
            </div>

            <div className={styles.customAmount}>
              <label htmlFor="custom-amount">Or enter a custom amount</label>
              <div className={styles.customInput}>
                <span className={styles.currency}>$</span>
                <input
                  id="custom-amount"
                  type="number"
                  min="1"
                  placeholder="Amount"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(0);
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || (!selectedAmount && !customAmount)}
            className={styles.submitButton}
          >
            {isLoading ? 'Processing...' :
             paymentMode === 'subscription' ?
             `Support with $${customAmount || selectedAmount}/month` :
             `Support with $${customAmount || selectedAmount}`}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Payments are processed securely through Stripe.</p>
          <p>
            <a href="/">← Back to Small Things</a>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}