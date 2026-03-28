export async function GET() {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: 'CX872UNNF9.com.terryheath.kindred',
          paths: ['*']
        }
      ]
    }
  };

  return new Response(JSON.stringify(aasa), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}