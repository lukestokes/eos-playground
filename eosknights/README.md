# The EOS Knights Stats Machine!

Because I'm a nerd, I was really curious about the amount of money people are spending on EOS Knights, a pretty neat example of a blockchain game running on EOS http://eosknights.io/ In the game, you can get materials and use them to craft items, both of which can be traded on the market. This little script queries the blockchain and stores the data in a json file.

Just change the `this.my_account` variable if you want to query for a specific account.

The last time I ran this, it took 26.9 minutes to update all the sales data from the chain.

To run it, have node installed and just type:

```
node app.js youraccountname
```

Replace `youraccountname` with your EOS account name. If you just want to see your account quickly, use `node app.js youraccountname false` which will skip updating the chain data first. If you want to update all accounts, just run `node app.js`. Note, it may take several hours to update all accounts from scratch unless you start with the existing data.json file.

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
Starting up at 15:18:36 2018-10-24
Loading data from data.json...
We have data on 3022 accounts at sequence number 314171
Updating: block number 23306543 at 2018-10-24T16:26:55.500 account sequence 314673
Updating: block number 23314651 at 2018-10-24T17:34:30.000 account sequence 315174
Updating: block number 23333867 at 2018-10-24T20:14:39.500 account sequence 315675
Updating: block number 23334258 at 2018-10-24T20:17:55.000 account sequence 315679
No new actions (latest: 315678)
This is where we'd loop through all accounts... let's just update ourselves for now.
Updating: block number 23333527 at 2018-10-24T20:11:49.500 account sequence 141
No new actions (latest: 140)
Ok... we should be done now. Let's look at the results!
Ending at 15:18:52 2018-10-24
Run time: 0.267 minutes.
{ account: '1lukestokes1',
  amount_spent: 8.518199999999997,
  number_of_purchases: 74,
  amount_earned: 8.134399999999998,
  number_of_sales: 88,
  account_action_seq: 140 }
```

Please don't just the code too harshly as it's my first node app. I borrowed heavily from @kasperfish and a deamon he built [here](https://github.com/eosdac/eosdac-token-explorer/blob/master/deamon/action_deamon.js).

If you find this useful, please set `1lukestokes1` as your referrer in the settings of your app and we'll both get some free Magic Water. :)
