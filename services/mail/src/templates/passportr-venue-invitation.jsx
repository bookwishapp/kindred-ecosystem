import { render as renderEmail } from '@react-email/render';
import { Text, Link, Hr } from '@react-email/components';
import { BaseLayout } from './base';

function PassportrVenueInvitation({ venueName, hopName, startDate, endDate, stampCutoff, redeemCutoff, completionText, couponExpiry, setupUrl, senderName }) {
  return (
    <BaseLayout
      product="passportr"
      footerText="Passportr — digital event passports"
    >
      <Text style={{ fontSize: '16px', color: '#2A2825', marginBottom: '16px' }}>
        Hi,
      </Text>
      <Text style={{ fontSize: '16px', color: '#2A2825', marginBottom: '16px' }}>
        You've been invited to participate in "<strong>{hopName}</strong>" on Passportr as a venue.
      </Text>
      <Text style={{ fontSize: '16px', color: '#2A2825', marginBottom: '24px' }}>
        <strong>Venue name:</strong> {venueName}
      </Text>

      <Hr style={{ borderColor: '#E5E5E5', margin: '24px 0' }} />
      <Text style={{ fontSize: '16px', color: '#2A2825', fontWeight: '600', marginBottom: '12px' }}>
        How Passportr Works
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '12px' }}>
        Passportr is a digital passport experience — no app to download, no paper to print.
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '12px' }}>
        Participants visit your venue, scan your QR code with their phone's camera, and their digital passport is automatically stamped. Once they've collected enough stamps across participating venues, they unlock a reward at each one they visited.
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '24px' }}>
        As a venue, your only job is to print your two QR codes and display them where customers can easily scan them — at the register, on the counter, or in your window. One QR code is for stamping passports. The other is for customers to redeem their reward when they've completed the hop. Your setup link below gives you access to both codes, your store details, and today's redemption count.
      </Text>

      <Hr style={{ borderColor: '#E5E5E5', margin: '24px 0' }} />
      <Text style={{ fontSize: '16px', color: '#2A2825', fontWeight: '600', marginBottom: '12px' }}>
        Hop Details
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '6px' }}>
        <strong>Event dates:</strong> {startDate} – {endDate}
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '6px' }}>
        <strong>Stamp cutoff:</strong> {stampCutoff}
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '6px' }}>
        <strong>Reward redemption deadline:</strong> {redeemCutoff}
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '6px' }}>
        <strong>Completion requirement:</strong> {completionText}
      </Text>
      <Text style={{ fontSize: '15px', color: '#6A6660', lineHeight: '1.6', marginBottom: '24px' }}>
        <strong>Coupon expiry:</strong> {couponExpiry} minutes after scanning
      </Text>

      <Hr style={{ borderColor: '#E5E5E5', margin: '24px 0' }} />
      <Text style={{ fontSize: '16px', color: '#2A2825', marginBottom: '16px' }}>
        Click the link below to set up your venue:
      </Text>
      <Text style={{ fontSize: '16px', marginBottom: '24px' }}>
        <Link href={setupUrl} style={{ color: '#2A2825', textDecoration: 'underline', wordBreak: 'break-all' }}>
          {setupUrl}
        </Link>
      </Text>
      <Text style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>
        This link is unique to your venue — don't share it.
      </Text>
      <Text style={{ fontSize: '16px', color: '#2A2825' }}>
        Passportr
      </Text>
    </BaseLayout>
  );
}

module.exports.render = function(data) {
  return {
    subject: `You're invited to join ${data.hopName} on Passportr`,
    html: renderEmail(<PassportrVenueInvitation {...data} />),
  };
};
