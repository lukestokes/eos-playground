class eosKnights {

  constructor(eos) {
    var self = this;
    this.game_account = 'eosknightsio';
    this.this_account = '';
    this.deamonize = 2;
    this.offset = 500;
    this.fs = require('fs');
    this.eos = eos;
    this.process_step = 1; // do the game account first, then update players (2)
    this.last_block_number = 0;
    this.last_block_time = '';
    this.account_index = -1;
    this.skip_update = false;
    this.data = {
      "total_amount_spent": 0,
      "total_number_of_purchases": 0,
      "total_amount_earned": 0,
      "total_number_of_sales": 0,
      "account_action_seq": 0,
      "last_synced_block_number": 0,
      "accounts": [],
      "account_data": []
    }

    console.log("Welcome to the EOS Knights Stats Machine!");
    this.start_time = new Date();
    console.log("Starting up at "+ this.start_time.toLocaleTimeString() + " " + this.start_time.toLocaleDateString());

    if (!this.fs.existsSync('data.json')) {
        let datatofile = JSON.stringify(this.data, null, 2);  
        this.fs.writeFileSync('data.json', datatofile);  
    }

    console.log("Loading data from data.json...");

    let jsondata = this.fs.readFileSync('data.json');  
    this.data = JSON.parse(jsondata);  

    console.log("We have data on " + this.data.accounts.length + " accounts at block number " + this.data.last_synced_block_number + " using sequence number " + this.data.account_action_seq);

    this.data.account_action_seq++;

    // Remove all eosio. accounts
    // Remove dividend payments accounts
    // confusing: whitehatguys and askforrefund
    var exclude_accounts = ['eosio.stake','eosio.ramfee','eosio.ram','gu3tcnrqhege','godzilla1234','eosknightscd','whuywonmeme1','eosknightpil','haytmnzrgege','coffeeloveos','eosknightscd','askforrefund','whitehatguys'];
    var index_to_remove = -1;
    for (var i = exclude_accounts.length - 1; i >= 0; i--) {
      index_to_remove = self.data.accounts.indexOf(exclude_accounts[i]);
      if (index_to_remove != -1) {
        self.data.accounts.splice(index_to_remove, 1);
        self.data.account_data.splice(index_to_remove, 1);
      }
    }

    if (process.argv.length > 2) {
      if (process.argv[2] == "run-report") {
        this.runReport();
      }
      this.this_account = process.argv[2];
      this.loadAccount(this.this_account);
      if (process.argv.length > 3) {
        // if they include a false here, skip updating things and jump to step 2
        if (process.argv[3] == "false") {
          this.process_step = 2;
        }
      }
    }

    this.deamon();
  }

  getTransactions(account) {
    var self = this;
    return this.eos.getActions(
      {
        account_name: account,
        pos: self.data.account_action_seq,
        offset: self.offset}
      ).then( async function(a) {
        if (a.actions.length == 0 || a.actions.length < 5) {
          console.log('No new actions'+ ` (latest: ${self.data.account_action_seq-1})`);
          //console.log(self.data);
          switch (self.process_step) {
              case 1:
                self.process_step = 2;
                let update_json_after_step_1 = JSON.stringify(self.data, null, 2);
                self.fs.writeFile("data.json", update_json_after_step_1, function(err) {}); 
                break;
              case 2:
                let update_json_after_step_2 = JSON.stringify(self.data, null, 2);
                self.fs.writeFile("data.json", update_json_after_step_2, function(err) {}); 
                console.log("And... we're done.");
                process.exit();
                break;
              default:
                break;
          };
          return false;
        }

        a.actions.forEach(async function(x, i, arr){
          try {
          let data = {};
          data.account_action_seq = x.account_action_seq;
          data.actiontype = x.action_trace.act.name;
          data.block_num = x.block_num;
          data.block_time =x.block_time;

          self.last_block_number = data.block_num;
          self.last_block_time = data.block_time;

          let include_this_action = true;
          if (data.block_num > a.last_irreversible_block ){
            include_this_action = false;
          }
          // avoid double counting data
          if (self.data.last_synced_block_number > self.last_block_number) {
            include_this_action = false;
          }
          // skip bad data
          if (!x.action_trace.act.data.quantity) {
            include_this_action = false;
          }

          if (!include_this_action) {
            return;
          }

          switch (data.actiontype) {
              case 'transfer':
                  self.data.last_synced_block_number = data.block_num;

                  data._from = x.action_trace.act.data.from;
                  data._to = x.action_trace.act.data.to;

                  let temp = x.action_trace.act.data.quantity.split(' ');
                  data._quantity = temp[0];
                  data._symbol = temp[1];
                  data._memo = x.action_trace.act.data.memo;
                  data.txid = x.action_trace.trx_id;

                  if (self.process_step == 1) {
                    let account_involved = data._to
                    if (data._to == self.game_account) {
                        account_involved = data._from;
                    }
                    let index = self.data.accounts.indexOf(account_involved);
                    if (index == -1) {
                      index = self.data.accounts.length;
                      let new_account = {
                        "account": account_involved,
                        "amount_spent": 0,
                        "number_of_purchases": 0,
                        "amount_earned": 0,
                        "number_of_sales": 0,
                        "last_synced_block_number": 0
                      }
                      self.data.accounts[index] = account_involved;
                      self.data.account_data[index] = new_account;
                    }

                    if (self.data.account_data[index].last_synced_block_number < data.block_num) {

                      // TEMPORARY LOGGING
                      //if (account_involved == '1lukestokes1') {
                      //  let temp_logging = JSON.stringify(data, null, 2);
                      //  self.fs.appendFile("1lukestokes1.json", temp_logging, function(err) {}); 
                      //}

                      self.data.account_data[index].last_synced_block_number = data.block_num;
                      if (data._to == self.game_account) {
                        self.data.account_data[index].amount_spent += parseFloat(data._quantity);
                        self.data.account_data[index].number_of_purchases++;
                        self.data.total_amount_spent += parseFloat(data._quantity);
                        self.data.total_number_of_purchases += 1;
                      } else {
                        self.data.account_data[index].amount_earned += parseFloat(data._quantity);
                        self.data.account_data[index].number_of_sales++;
                        self.data.total_amount_earned += parseFloat(data._quantity);
                        self.data.total_number_of_sales += 1;
                      }
                    }
                  }

                  break;
              default:
                  //console.log('Unknown Action!');
          };

          } catch(e) {
            console.log(e);
            process.exit();
          }

        });
        self.data.account_action_seq += a.actions.length;

        console.log("Updating: block number " + self.last_block_number + " at " + self.last_block_time + " account sequence " + self.data.account_action_seq);
        //console.log(self.data);

        let jsondata_updated = JSON.stringify(self.data, null, 2);  
        self.fs.writeFile("data.json", jsondata_updated, function(err) {});
        return true;
      
    })
    .catch(x => {
      console.log(x);
      process.exit();
    });
  }

  async deamon(){
      var self = this;

      switch (self.process_step) {
          case 1:
            let actions = await self.getTransactions(self.game_account);
            break;
          case 2:
            console.log("Ok... we should be done now. Let's look at the results!");
            self.end_time = new Date();
            console.log("Ending at "+ self.end_time.toLocaleTimeString() + " " + self.end_time.toLocaleDateString());
            let one_minute=1000*60;
            let run_time_ms = self.end_time.getTime() - self.start_time.getTime();
            console.log("Run time: " + parseFloat(run_time_ms/one_minute).toPrecision(3) + " minutes.");
            if (self.this_account != "") {
              console.log(self.data.account_data[self.account_index]);
            }
            console.log("Total Amount Spent: " + self.data.total_amount_spent);
            console.log("Total Number of Purchases: " + self.data.total_number_of_purchases);
            console.log("Total Amount Earned: " + self.data.total_amount_earned);
            console.log("Total Number of Sales: " + self.data.total_number_of_sales);
            process.exit();
            break;
          default:
            break;
      };

      await self._sleep(self.deamonize*1000)
      self.deamon();

  }

  _sleep(t) {
      return new Promise(resolve => setTimeout(resolve, t));
  }

  loadAccount(account){
      var self = this;
      self.account_index = self.data.accounts.indexOf(account);
      if (self.account_index == -1) {
        console.log("Account not found: " + account);
        console.log("Please update your local data.");
        process.exit();
      }
  }

  runReport() {
    var self = this;
    var top_net_earnings = [];
    var net_profit_loss = 0;
    var net_profit_loss_report_text_line = '';
    var net_profit_loss_report_text = '';

    self.data.account_data.sort(function(a,b){
      let a_net_profit = a.amount_earned - a.amount_spent;
      let b_net_profit = b.amount_earned - b.amount_spent;

      if (a_net_profit == b_net_profit) {
        return 0;
      } else {
        return (a_net_profit > b_net_profit) ? -1 : 1;
      }
    });

    for (var i = 0; i < self.data.account_data.length; i++) {
      net_profit_loss = self.data.account_data[i].amount_earned - self.data.account_data[i].amount_spent;
      net_profit_loss_report_text_line = (i+1) + ": " + self.data.account_data[i].account + " | " + net_profit_loss;
      //console.log(net_profit_loss_report_text_line);
      net_profit_loss_report_text = net_profit_loss_report_text + net_profit_loss_report_text_line + "\n";
    }

    self.fs.writeFileSync("net_profit_loss_report.txt", net_profit_loss_report_text, function(err) {}); 

    process.exit();
  }

}

const config = {
    expireInSeconds: 60,
    broadcast: true,
    debug: false,
    sign: true,
    // mainNet bp endpoint
    httpEndpoint: 'https://eos.greymass.com',
    // mainNet chainId
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
};


EosApi = require('eosjs-api')
eos = EosApi(config);

doit = new eosKnights(eos);
