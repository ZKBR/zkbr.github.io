+++
title = 'Benchmarking the Performance of zkVMs'
date = '2025-05-07T11:59:14-03:00'
draft = false
projetos = ['Benchmark']
status = ['em andamento']
tags = ['Blockchain']
+++

Verifiable computation outsourcing has become a critical tool in various applications, particularly in scaling blockchain networks like Ethereum. A prominent example is the use of rollups, a layer-2 scaling solution designed to increase Ethereum's transaction throughput. In this approach, transactions are offloaded to a secondary layer that mirrors Ethereum's functionality but operates on a high-performance cluster. To maximize efficiency, hundreds of transactions are batched, compressed, and processed together. The resulting state of this layer-2 ledger is then computed and submitted to the Ethereum mainnet for verification and permanent record-keeping.

A key component of this verification process is the use of zero-knowledge virtual machines (zkVMs), which enable efficient and privacy-preserving proof generation. Currently, there are approximately a dozen team actively developing zkVM implementations. Given the growing interest and diversity in zkVM designs, our objective is to establish a comprehensive set of criteria for objectively evaluating and comparing their performance.