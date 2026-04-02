const { render: renderEmail } = require('@react-email/render');
const React = require('react');
const { BaseLayout } = require('./base');

function TerryHeathNewsletter({ content, email }) {
  return React.createElement(BaseLayout, {
    product: 'terryheath',
    footerText: 'Small Things by Terry Heath',
    unsubscribeUrl: email ? `${process.env.MAIL_BASE_URL}/unsubscribe/terryheath/${email}` : null,
  }, React.createElement('div', { dangerouslySetInnerHTML: { __html: content } }));
}

module.exports.render = async function(data) {
  const unsubscribeUrl = data.email
    ? `${process.env.MAIL_BASE_URL}/unsubscribe/terryheath/${data.email}`
    : null;
  return {
    subject: data.subject || 'Small Things',
    html: await renderEmail(React.createElement(TerryHeathNewsletter, { ...data, unsubscribeUrl })),
  };
};
