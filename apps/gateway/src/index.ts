import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from 'apollo-server';
import { createFederatedServiceConfig } from '@teste-manuel/graphql';
import { createAuthContext } from './middleware/authMiddleware';

const port = process.env.PORT || 4000;

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      createFederatedServiceConfig('auth-service', 3001),
      createFederatedServiceConfig('domain-service', 3002),
      createFederatedServiceConfig('wordpress-service', 3003),
    ],
    pollIntervalInMs: 10000,
  }),
});

const server = new ApolloServer({
  gateway,
  context: async ({ req }) => {
    const authContext = createAuthContext(req?.headers?.authorization);
    return authContext;
  },
});

server.listen({ port }).then(({ url }) => {
  console.log(`Gateway running at ${url}`);
});
