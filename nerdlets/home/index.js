import React from 'react';
import { AccountsQuery, Dropdown, DropdownItem, nerdlet } from 'nr1';
import { Dimmer, Loader } from 'semantic-ui-react';
import Entities from './entities';

export default class HomeNerdlet extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      accounts: [],
      search: '',
      selectedAccount: null
    };

    this.handleChange = this.handleChange.bind(this);

    nerdlet.setConfig({
      timePicker: false
    })
  }

  async componentDidMount() {
    const accounts = await AccountsQuery.query();

    if (accounts.error) {
      console.debug(accounts.error);
      this.setState({ loading: false });
    } else {
      this.setState({
        accounts: accounts.data,
        loading: false
      });
    }
  }


  handleChange(acct) {
    this.setState({ selectedAccount: acct, search: '' });
  }

  renderAccountDropdown() {
    const { accounts, search, selectedAccount } = this.state;
    const opts = [];

    for (const acct of accounts) {
      opts.push({ id: acct.id, name: acct.name });
    }

    let filteredAccounts = [...accounts];
    if (search && search.length > 0) {
      const re = new RegExp(search, 'i');
      filteredAccounts = accounts.filter((a) => {
        return a.name.match(re);
      });
    }

    return (
      <Dropdown
        title={selectedAccount ? selectedAccount.name : 'Account Filter'}
        items={opts}
        search={search}
        onSearch={(e) => this.setState({ search: e.target.value })}
      >
      {filteredAccounts.map((a) => (
        <DropdownItem onClick={() => this.handleChange(a)} key={a.id}>{a.name}</DropdownItem>
      ))}
      </Dropdown>
    );

  }



  //return <Entities />;

  render() {
    const { accounts, loading, selectedAccount } = this.state;

    if (loading) {
      return (
        <>
          <Dimmer active={loading}>
            <Loader size="medium">Loading</Loader>
          </Dimmer>
        </>
      )
    } else {
      if (accounts.length > 0) {
        return (
          <>
            {this.renderAccountDropdown()}
            {
              selectedAccount
              ?
              <Entities account={selectedAccount.id} />
              :
              <h1>Select an account above</h1>
            }
          </>
        )
      } else {
        return <h3>accounts could not be retrieved!</h3>
      }
    }
  }
}
