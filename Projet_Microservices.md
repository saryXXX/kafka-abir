# Projet : Architecture Microservices

## 1. Description du projet
Ce projet consiste à concevoir et développer une application basée sur une architecture microservices utilisant exclusivement **Node.js** [cite: 6]. L'application doit comporter au moins trois microservices indépendants, une API Gateway, un client (ou interface de test), un broker Kafka et des bases de données séparées pour chaque microservice [cite: 7].

## 2. Objectifs du projet
L'objectif est de créer une application fonctionnelle démontrant une séparation claire des responsabilités entre les microservices et une communication efficace entre les composants [cite: 10, 11].

## 3. Architecture attendue
L'application doit respecter l'architecture suivante [cite: 13] :
* **Client** : Communique via REST et GraphQL (HTTP/1.1, JSON) avec l'API Gateway [cite: 16, 17].
* **API Gateway** : Point d'entrée principal communiquant avec les microservices via gRPC (HTTP/2, Protobuf) [cite: 18, 19, 42, 46].
* **Microservices** : Au moins trois services autonomes, chacun avec sa propre base de données [cite: 7, 49, 53, 57].
* **Communication Inter-services** : Kafka est utilisé pour la communication asynchrone [cite: 55, 84].

## 4. Spécifications Techniques

### 4.1. API Gateway
* Joue le rôle de point d'entrée principal [cite: 42].
* Expose des endpoints REST et des requêtes GraphQL [cite: 44, 45].
* Communique avec les microservices via gRPC [cite: 46].
* Ne doit pas contenir la logique métier principale [cite: 47].

### 4.2. Microservices
* Développés en Node.js [cite: 50].
* Responsabilité claire et indépendance vis-à-vis des autres [cite: 51, 54].
* Expose une interface gRPC [cite: 52].
* Possède sa propre base de données [cite: 53].

### 4.3. Communication et Données
* **gRPC** : Élément technique central (fichiers `.proto`, services fonctionnels, messages Protobuf) [cite: 59, 65, 66, 67].
* **REST** : Pour les opérations classiques (création, consultation, modification, suppression, recherche) [cite: 72, 73, 74, 75, 76, 77].
* **GraphQL** : Pour des requêtes flexibles et précises [cite: 81].
* **Kafka** : Pour la communication asynchrone événementielle entre microservices [cite: 84, 96].
* **Bases de données** : Uniquement **SQLite3** (SQL) ou **RxDB** (NoSQL) [cite: 99, 100, 101].

## 5. Organisation du travail
* Réalisation en binôme ou trinôme [cite: 104].
* Suivi obligatoire sur **GitHub** [cite: 8, 106].
* La collaboration est évaluée via des KPI (régularité des commits, branches, équilibre des contributions) [cite: 109, 110, 111, 113, 117].

## 6. Livrables attendus
1. Code source complet sur GitHub.
2. Documentation technique.
3. Fichier README clair.
4. Schéma d'architecture.
5. Fichiers `.proto`.
6. Description des endpoints REST et du schéma GraphQL.
7. Description des topics Kafka et des bases de données [cite: 119, 120, 125, 126, 127, 128, 129, 130, 131, 132, 133].

## 7. Barème d'évaluation (Total: 20 pts)
* **Technique (16 pts)** : gRPC (5 pts), REST (3 pts), GraphQL (3 pts), Kafka (3 pts), Qualité globale (2 pts) [cite: 136, 137, 138, 146, 151, 160, 168].
* **Originalité et Collaboration (4 pts)** : Sujet, valeur ajoutée, collaboration GitHub, organisation [cite: 173, 174, 177, 178, 179].

## 8. Idées de sujets
* Marketplace e-commerce, plateforme de réservation, système de livraison en temps réel, plateforme de formation en ligne, système IoT, cybersécurité, application bancaire, gestion hospitalière, flotte de véhicules, streaming vidéo [cite: 190, 191, 192, 193, 194, 195, 196, 197, 198, 199].
