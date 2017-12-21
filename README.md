# github-pr-analyzer

Pull request analyzer using Github's GraphQL API

## Setup

Copy the config template as config.json and replace the values

```
cp config.json.template config.json
```

## Run

```
node main.js <user|organization> <Github account name to analyze>
```

Examples:

```
node main.js user ryyan
node main.js organization github
```
