# Ohana Indexer

Standalone GraphQL indexer for Handshake vouch events. Indexes VouchRequested, VouchAccepted, VouchDenied, VouchCancelled with category.

## Schema

- Vouch: target, voucher, category, status, timestamp
- VouchCategoryStats: aggregated counts per target/category

## Integration

Configure subgraph.yaml with Handshake contract address and start block.
Query via GraphQL for proxyVouchCalc transitive trust calculation.
