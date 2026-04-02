import { render as renderEmail } from '@react-email/render';
import { Text } from '@react-email/components';
import { BaseLayout } from './base';

function TerryHeathNewsletter({ subject, content, email }) {
  return (
    <BaseLayout
      product="terryheath"
      footerText="Small Things by Terry Heath"
      unsubscribeUrl={`${process.env.MAIL_BASE_URL}/unsubscribe/terryheath/${email}`}
    >
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </BaseLayout>
  );
}

module.exports.render = function(data) {
  return {
    subject: data.subject || 'Small Things',
    html: renderEmail(<TerryHeathNewsletter {...data} />),
  };
};
