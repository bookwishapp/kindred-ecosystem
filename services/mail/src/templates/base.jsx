const {
  Html, Head, Body, Container, Text, Link, Hr
} = require('@react-email/components');
const React = require('react');

function BaseLayout({ product, children, unsubscribeUrl, footerText }) {
  const colors = {
    'terryheath': { accent: '#2A2825', bg: '#F5F3EF' },
    'passportr': { accent: '#2A2825', bg: '#FFFFFF' },
    'associations': { accent: '#2A2825', bg: '#F5F3EF' },
    'analoglist': { accent: '#2AB8A0', bg: '#FFFFFF' },
    'kindred': { accent: '#2A2825', bg: '#FFFFFF' },
  };

  const theme = colors[product] || colors['associations'];

  const productUrls = {
    'associations': 'https://associations.dampconcrete.com',
    'passportr': 'https://passportr.dampconcrete.com',
    'analoglist': 'https://analoglist.dampconcrete.com',
    'kindred': 'https://kindred.dampconcrete.com',
  };

  const productUrl = productUrls[product];

  return React.createElement(Html, null,
    React.createElement(Head, null),
    React.createElement(Body, {
      style: { backgroundColor: theme.bg, margin: 0, padding: 0, fontFamily: 'Georgia, serif' }
    },
      React.createElement(Container, {
        style: { maxWidth: '600px', margin: '0 auto', padding: '48px 24px' }
      },
        children,
        React.createElement(Hr, { style: { borderColor: 'rgba(42,40,37,0.1)', margin: '40px 0 24px' } }),
        React.createElement(Text, {
          style: { fontSize: '12px', color: '#C8C4BC', lineHeight: '1.6', margin: 0 }
        },
          footerText,
          ' — part of ',
          React.createElement(Link, { href: 'https://dampconcrete.com', style: { color: '#C8C4BC' } }, 'Damp Concrete'),
          productUrl ? React.createElement(React.Fragment, null,
            ' — ',
            React.createElement(Link, { href: productUrl, style: { color: '#C8C4BC' } }, 'built by Terry Heath')
          ) : null,
          unsubscribeUrl ? React.createElement(React.Fragment, null,
            ' — ',
            React.createElement(Link, { href: unsubscribeUrl, style: { color: '#C8C4BC' } }, 'unsubscribe')
          ) : null
        )
      )
    )
  );
}

module.exports.BaseLayout = BaseLayout;
