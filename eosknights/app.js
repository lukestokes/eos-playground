class eosKnights {

  constructor(eos) {
    var self = this;
    this.game_account = 'eosknightsio';
    this.this_account = '';
    this.deamonize = 1;
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
      "current_account_action_seq": 0,
      "game_account_action_seq": 0,
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

    console.log("We have data on " + this.data.accounts.length + " accounts at sequence number " + this.data.game_account_action_seq);

    this.data.current_account_action_seq = this.data.game_account_action_seq;
    this.data.current_account_action_seq++;

    // Remove all eosio. accounts
    // Remove gu3tcnrqhege which includes dividend payments
    var exclude_accounts = ['eosio.stake','eosio.ramfee','eosio.ram','gu3tcnrqhege'];
    var index_to_remove = -1;
    for (var i = exclude_accounts.length - 1; i >= 0; i--) {
      index_to_remove = self.data.accounts.indexOf(exclude_accounts[i]);
      if (index_to_remove != -1) {
        self.data.accounts.splice(index_to_remove, 1);
        self.data.account_data.splice(index_to_remove, 1);
      }
    }

    if (process.argv.length > 2) {
      this.this_account = process.argv[2];
      if (process.argv.length > 3) {
        // if they include a false here, skip updating things and jump to step 2
        if (process.argv[3] == "false") {
          this.process_step = 3;
          this.loadAccount(this.this_account);
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
        pos: self.data.current_account_action_seq,
        offset: self.offset}
      ).then( async function(a){
        if(a.actions.length == 0){
          console.log('No new actions'+ ` (latest: ${self.data.current_account_action_seq-1})`);
          //console.log(self.data);

          switch (self.process_step) {
              case 1:
                self.process_step = 2;
                self.data.game_account_action_seq = self.data.current_account_action_seq;
                let update_json_after_step_1 = JSON.stringify(self.data, null, 2);
                self.fs.writeFile("data.json", update_json_after_step_1, function(err) {}); 
                break;
              case 2:
                let update_json_after_step_2 = JSON.stringify(self.data, null, 2);
                self.fs.writeFile("data.json", update_json_after_step_2, function(err) {}); 
                if (self.this_account != "") {
                  self.process_step = 3;
                } else {
                  if (self.account_index < self.data.accounts.length-1) {
                    console.log("Done updating account " + self.data.accounts[self.account_index]);
                    console.log(self.data.account_data[self.account_index]);
                    self.account_index++;
                    self.loadAccount(self.data.accounts[self.account_index]);
                  } else {
                    self.process_step = 3;
                  }
                }
                break;
              case 3:
                console.log("And... we're done.");
                process.exit();
                break;
              default:
                break;
          };
          return false;
        }

        a.actions.forEach(async function(x, i, arr){

          let data = {};
          data.account_action_seq = x.account_action_seq;
          data.actiontype = x.action_trace.act.name;
          data.block_num = x.block_num;
          data.block_time =x.block_time;

          self.last_block_number = data.block_num;
          self.last_block_time = data.block_time;

          data.confirmed = false;

          if(data.block_num <= a.last_irreversible_block ){
            data.confirmed = true;
          }

          switch (data.actiontype) {
              case 'transfer':
                  data._from = x.action_trace.act.data.from;
                  data._to = x.action_trace.act.data.to;
                  let temp = x.action_trace.act.data.quantity.split(' ');
                  data._quantity = temp[0];
                  data._symbol = temp[1];
                  data._memo = encodeURIComponent(x.action_trace.act.data.memo);
                  data.txid = x.action_trace.trx_id;

                  if (self.process_step == 2) {
                    if (data._to == self.game_account) {
                      self.data.account_data[self.account_index].amount_spent += parseFloat(data._quantity);
                      self.data.account_data[self.account_index].number_of_purchases++;
                      self.data.account_data[self.account_index].account_action_seq = data.account_action_seq;
                      self.data.total_amount_spent += parseFloat(data._quantity);
                      self.data.number_of_total_amount_spent += 1;
                    }
                  }
                  if (self.process_step == 1) {
                    let index = self.data.accounts.indexOf(data._to);
                    if (index == -1) {
                      index = self.data.accounts.length;
                      let new_account = {
                        "account": data._to,
                        "amount_spent": 0,
                        "number_of_purchases": 0,
                        "amount_earned": 0,
                        "number_of_sales": 0,
                        "account_action_seq": 0
                      }
                      self.data.accounts[index] = data._to;
                      self.data.account_data[index] = new_account;
                    }
                    self.data.account_data[index].amount_earned += parseFloat(data._quantity);
                    self.data.account_data[index].number_of_sales++;
                    self.data.total_amount_earned += parseFloat(data._quantity);
                    self.data.total_number_of_sales += 1;
                  }

                  break;
              default:
                  //console.log('Unknown Action!');
          };
        });
        self.data.current_account_action_seq += a.actions.length;

        console.log("Updating: block number " + self.last_block_number + " at " + self.last_block_time + " account sequence " + self.data.current_account_action_seq);
        //console.log(self.data);

        let jsondata_updated = JSON.stringify(self.data, null, 2);  
        self.fs.writeFile("data.json", jsondata_updated, function(err) {}); 

        return true;
      
    })
    .catch(x => console.log(x) );
  }

  async deamon(){
      var self = this;

      switch (self.process_step) {
          case 1:
            let actions = await self.getTransactions(self.game_account);
            break;
          case 2:
            if (self.account_index == -1) {
              if (self.this_account != "") {
                console.log("Updating data for " + self.this_account);
                self.loadAccount(self.this_account);
              } else {
                self.account_index = 0;
                self.loadAccount(self.data.accounts[self.account_index]);
                console.log("Loading data for " + self.data.accounts[self.account_index]);
              }
            }
            let my_actions = await self.getTransactions(self.data.accounts[self.account_index]);
            break;
          case 3:
            console.log("Ok... we should be done now. Let's look at the results!");
            self.end_time = new Date();
            console.log("Ending at "+ self.end_time.toLocaleTimeString() + " " + self.end_time.toLocaleDateString());
            let one_minute=1000*60;
            let run_time_ms = self.end_time.getTime() - self.start_time.getTime();
            console.log("Run time: " + parseFloat(run_time_ms/one_minute).toPrecision(3) + " minutes.");
            if (self.this_account != "") {
              console.log(self.data.account_data[self.account_index]);
            } else {
              console.log("Total Amount Spent: " + self.data.total_amount_spent);
              console.log("Total Number of Purchases: " + self.data.total_number_of_purchases);
              console.log("Total Amount Earned: " + self.data.total_amount_earned);
              console.log("Total Number of Sales: " + self.data.total_number_of_sales);
            }
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
      //console.log("We are inside loadAccount for account " + account);
      //console.log("account_index is " + self.account_index);
      self.data.current_account_action_seq = parseInt(self.data.account_data[self.account_index].account_action_seq) + 1;
      //console.log("The new sequence number is " + self.data.current_account_action_seq);
  }  

}

const config = {
    expireInSeconds: 60,
    broadcast: true,
    debug: false,
    sign: true,
    // mainNet bp endpoint
    httpEndpoint: 'https://api.eosnewyork.io',
    // mainNet chainId
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
};


EosApi = require('eosjs-api')
eos = EosApi(config);

doit = new eosKnights(eos);
