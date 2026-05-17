import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { createResolvers } from './resolvers';
import { IProductRepository } from '../../domain/product/IProductRepository';

export async function startGraphQLServer(repo: IProductRepository, port: number): Promise<void> {
  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers: createResolvers(repo) }),
  });

  const { url } = await startStandaloneServer(server, { listen: { port } });
  console.log(`[domain-service] GraphQL subgraph at ${url}`);
}
