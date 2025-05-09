+++
title = 'Scalable Attestation for Edited Images: Accelerating Zero-Knowledge C2PA Alternatives'
date = '2025-05-07T11:59:32-03:00'
draft = false
projetos = ['images']
status = ['em andamento']
tags = ['zk']
+++

In the age of generative artificial intelligence, ensuring the provenance and authenticity of digital images has emerged as a critical challenge. The Coalition for Content Provenance and Authenticity (C2PA) introduced a signature scheme to address this issue, but it relies on trust when images are edited prior to publication—a near-ubiquitous scenario. Dan Boneh et al. proposed an alternative approach, replacing C2PA signatures with zero-knowledge proofs to verify that edits were applied to a legitimately signed image. While this represents a significant advancement, their method currently processes only one operation at a time, and proof generation remains computationally impractical for real-world use. This work focuses on optimizing the proving time of such verification methods while enabling the seamless composition of multiple editing operations within a single image.