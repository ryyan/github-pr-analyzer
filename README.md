# github-pr-analyzer

Pull request analyzer using Github's GraphQL API

## Setup

Copy the config template as config.json and replace the values

```sh
cp config.json.template config.json
```

## Run

```sh
node main.js <user|organization> <Github account name to analyze>
```

Examples:

```sh
$ node main.js user ryyan
Start pull request analyzer
Load config.json values and command line args
Check cache for this account
Initialize github client
Fetch repositories
Fetch pull requests for github-pr-analyzer
Fetch pull requests for rolodex
Fetch pull requests for catbin
...
Cache repositories

Pull Request Counts by State
----------------------------
Open    Closed  Merged  Total   Repository
0       0       0       0       hackertools
0       0       0       0       thrift-benchmark
8       2       0       10      rock-paper-scissors
0       0       0       0       ryyan
19      9       0       28      4d-bank
0       0       0       0       dotfiles
12      2       1       14      http-bench
0       0       0       0       github-pr-analyzer
0       0       0       0       rolodex
8       0       0       8       catbin
0       0       0       0       aoc2020
0       0       0       0       grpc-bench
47      13      1       60      Total

Pull Request Counts by Author
-----------------------------
PRs     Author
59      dependabot
1       ryyan
```

```sh
$ node main.js organization github
```
