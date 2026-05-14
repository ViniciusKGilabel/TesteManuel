import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { createFederatedServiceConfig } from '@teste-manuel/graphql';
import { createAuthContext } from './middleware/authMiddleware';

const port = Number(process.env.PORT ?? 4000);

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      createFederatedServiceConfig('auth-service', 3001),
      createFederatedServiceConfig('domain-service', 3002),
      createFederatedServiceConfig('order-service', 3003),
      createFederatedServiceConfig('wordpress-service', 8080),
    ],
    pollIntervalInMs: 10000,
  }),
});

const server = new ApolloServer({ gateway });

startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => {
    const authContext = createAuthContext(req?.headers?.authorization);
    return authContext;
  },
}).then(({ url }) => {
  console.log(`Gateway running at ${url}`);
});
