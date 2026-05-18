import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { createResolvers } from './resolvers';
import { IWooCommercePort } from '../../application/ports/IWooCommercePort';
import { AddToCartHandler } from '../../application/handlers/AddToCartHandler';

export async function startGraphQLServer(
  woo: IWooCommercePort,
  addToCart: AddToCartHandler,
  port: number,
): Promise<void> {
  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers: createResolvers(woo, addToCart) }),
  });

  const { url } = await startStandaloneServer(server, { listen: { port } });
  console.log(`[domain-service] GraphQL subgraph at ${url}`);
}
