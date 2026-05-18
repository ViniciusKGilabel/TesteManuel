import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { createFederatedServiceConfig } from '@teste-manuel/graphql';
import { createAuthContext } from './middleware/authMiddleware';

const port = Number(process.env.PORT ?? 4000);

const subgraphURL = (envVar: string, fallbackPort: number) =>
  process.env[envVar] ?? `http://localhost:${fallbackPort}/graphql`;

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      // auth-service is now a BetterAuth REST service at :3001/api/auth/*
      // Authentication goes directly from the client → auth-service, not through this gateway.
      createFederatedServiceConfig('domain-service', subgraphURL('SUBGRAPH_DOMAIN_URL', 3002)),
      createFederatedServiceConfig('order-service', subgraphURL('SUBGRAPH_ORDER_URL', 3003)),
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
