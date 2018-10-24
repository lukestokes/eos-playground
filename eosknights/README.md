# The EOS Knights Stats Machine!

Because I'm a nerd, I was really curious about the amount of money people are spending on EOS Knights, a pretty neat example of a blockchain game running on EOS http://eosknights.io/ In the game, you can get materials and use them to craft items, both of which can be traded on the market. This little script queries the blockchain and stores the data in a json file.

Just change the `this.my_account` variable if you want to query for a specific account.

The last time I ran this, it took 26.9 minutes to update all the sales data from the chain.

To run it, have node installed and just type:

```
node app.js
```

If you don't have eosjs installed, you'll have to install that first via:

```
npm install eosjs
```

It will update your data.json file with the latest data from the chain and then output the buys and sells for the account you specified.

Things that could be improved:

* Check for appropriate memos instead of just transfers between accounts.
* Run through and process all accounts, not just a single specified account.
* Create some stats and reports to show who has the best ROI in the game, etc.
* Create a wall of shame for those who are spending the most money in the game. Heheh.

Example output:

```
➜  eosknights git:(master) node app.js
Welcome to the EOS Knights Stats Machine!
Starting up at 00:06:32 2018-10-24
Loading data from data.json...
We have data on 2975 accounts at sequence number 310782
Updating: block number 23225032 at 2018-10-24T05:06:32.000 account sequence 310858
No new actions (latest: 310857)
This is where we'd loop through all accounts... let's just update ourselves for now.
No new actions (latest: 134)
Ok... we should be done now. Let's look at the results!
Ending at 00:06:37 2018-10-24
Run time: 0.0845 minutes.
{ account: '1lukestokes1',
  buys: 8.489199999999995,
  buy_count: 68,
  sells: 8.134399999999998,
  sell_count: 88,
  account_action_seq: 134 }
```

Please don't just the code too harshly as it's my first node app. I borrowed heavily from @kasperfish and a deamon he built [here](https://github.com/eosdac/eosdac-token-explorer/blob/master/deamon/action_deamon.js).
