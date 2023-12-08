import React from 'react';
import { NerdGraphQuery, Spinner } from 'nr1';
import _ from 'lodash';
import { Dropdown, Input, Modal, Table } from 'semantic-ui-react';
const query = require('./utils');


export default class Entities extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      domains: [],
      filteredDomains: null,
      entities: null,
      filteredEntiites: null,
      column: null,
      direction: null,
      searchText: '',
      openDrilldown: false,
      fetchingAlerts: false,
      entityAlertConfig: [],
      selectedEntity: null,
      policies: []
    };

    this.handleChange = this.handleChange.bind(this);
  }


  async componentDidMount() {
    let cursor = null;
    let allEntities = [];
    await this.getEntities(cursor, allEntities);
    await this.getPolicies(2981243);
  }

  handleChange(e, { value }) {
    const { domains, entities } = this.state;

    if (value.length > 0) {
      const filteredTypes = domains.filter(d => value.includes(d.facet.type));
      const filteredTable = entities.filter(e => value.includes(e.type))
      this.setState({
        filteredDomains: filteredTypes,
        filteredEntiites: filteredTable
      });
    } else {
      this.setState({
        filteredDomains: domains,
        filteredEntiites: entities
      });
    }
  }

  renderDropdown() {
    const { domains } = this.state;
    const opts = [];

    for (const d of domains) {
      opts.push({ key: d.facet.type, text: d.facet.type, value: d.facet.type });
    }

    return (
      <div>
        <Dropdown
          style={{ marginBottom: '6px' }}
          placeholder="Entity Type Filter"
          multiple
          search
          selection
          options={opts}
          onChange={this.handleChange}
        />
      </div>
    )
  }

  async getPolicies(acct) {
    let res = await NerdGraphQuery.query({query: query.policies(acct)});

    if (res.errors) {
      console.debug(`Failed to retrieve policies`);
      console.debug(res.errors);
    } else {
      let p = res.data.actor.account.alerts.policiesSearch.policies;
      this.setState({ policies: p });
    }
  }

  async getEntities(c, allEntities) {
    let res = await NerdGraphQuery.query({query: query.allEntities(c)});

    if (res.errors) {
      console.debug(`Failed to retrieve entities`);
      console.debug(res.errors);
    } else {
      let nextCursor = res.data.actor.entitySearch.results.nextCursor;
      let entities = res.data.actor.entitySearch.results.entities;
      let typeCounts = res.data.actor.entitySearch.counts;
      if (nextCursor == null) {
        allEntities = allEntities.concat(entities);
        this.setState({
          entities: allEntities,
          filteredEntiites: allEntities,
          domains: typeCounts,
          loading: false
        })
      } else {
        allEntities = allEntities.concat(entities);
        await this.getEntities(nextCursor, allEntities);
      }
    }
  }

  async getConditions(entity) {
    let res = await NerdGraphQuery.query({query: query.conditionIds(entity)});

    if (res.errors) {
      console.debug(`Failed to retrieve condition ids`);
      console.debug(res.errors);
    } else {
      let c = res.data.actor.account.nrql.results[0];
      let formattedConditions = null;
      if (c.conditions.length > 0) {
        formattedConditions = `(${c.conditions.map(value => `'${value}'`).join(',')})`
      }
      return formattedConditions;
    }
  }

  async getConditionDetail(conditions) {
    let res = await NerdGraphQuery.query({query: query.conditionDetail(conditions)});

    if (res.errors) {
      console.debug(`Failed to retrieve condition detail`);
      console.debug(res.errors);
    } else {
      let detail = res.data.actor.entitySearch.results.entities;
      if (detail.length > 0) {
        let formattedDetail = [];
        for (var i=0; i<detail.length; i++) {
          let enabled = this.getValuesForKey(detail[i].tags, 'enabled');
          let id = this.getValuesForKey(detail[i].tags, 'id');
          let polId = this.getValuesForKey(detail[i].tags, 'policyId');
          let type = this.getValuesForKey(detail[i].tags, 'type');

          let aCondition = {'name': detail[i].name, 'guid': detail[i].guid, 'enabled': enabled, 'id': id, 'policyId': polId, 'type': type};

          formattedDetail.push(aCondition);
        }
        return formattedDetail;
      }
    }
  }

  getValuesForKey(tags, key) {
    const tag = tags.find(tag => tag.key === key);
    return tag ? tag.values[0] : null;
  }

  handleSort(clickedCol) {
    const { column, direction, filteredEntiites, entities } = this.state;

    let newTableData = filteredEntiites;

    newTableData = _.orderBy(
      newTableData,
      [clickedCol.toLowerCase()],
      [
        direction === 'ascending' ? 'asc' : 'desc',
        direction === 'ascending' ? 'desc' : 'asc'
      ]
    );

    this.setState({
      column: clickedCol,
      filteredEntiites: newTableData,
      direction: direction === 'ascending' ? 'descending' : 'ascending'
    });
  }

  async openDrilldownAndGetData(r) {
    let { openDrilldown, selectedEntity, policies } = this.state;

    let conditionDetail = [];

    await this.setState({
      openDrilldown: true,
      fetchingAlerts: true,
      selectedEntity: r
    });

    let conditions = await this.getConditions(r);
    if (conditions) {
      conditionDetail = await this.getConditionDetail(conditions);
      if (conditionDetail.length > 0) {
        conditionDetail = conditionDetail.map(c => {
          const pol = policies.find(p => p.id === c.policyId);
          return {...c, policyName: pol ? pol.name : null };
        });
      }
    }

    await this.setState({
      entityAlertConfig: conditionDetail,
      fetchingAlerts: false
    });
  }

  renderEntityTable() {
    const { column, direction, entities, filteredEntiites, searchText } = this.state;

    const headers = ['Name', 'Type', 'Guid'];

    return (
      <div
        style={{
          overflowY: 'scroll',
          display: entities.length === 0 || entities == null ? 'none' : 'flex'
        }}
      >
      <Table compact selectable sortable celled>
        <Table.Header class="sorted ascending">
          <Table.Row>
            {headers.map((h, k) => {
              return (
                  <Table.HeaderCell
                    sorted={column === h ? direction : undefined}
                    onClick={() => this.handleSort(h)}
                    key={k}
                  >
                    {h}
                  </Table.HeaderCell>
              );
            })}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {filteredEntiites.filter(row => {
            return (
              row.name.toLowerCase().includes(searchText.toLowerCase())
            );
          }).map((row, e) => {
            return (
              <Table.Row key={e}>
                <Table.Cell onClick={() => this.openDrilldownAndGetData(row)}>
                <a>{row.name}</a>
                </Table.Cell>
                <Table.Cell>{row.type}</Table.Cell>
                <Table.Cell>{row.guid}</Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </div>
    );
  }

  renderAlerts() {
    let { fetchingAlerts, entityAlertConfig, openDrilldown, selectedEntity } = this.state;

    const alertHeaders = ['Policy', 'Condition'];

    return (
      <>
      <Modal size='small' open={openDrilldown} onClose={() => this.setState({ openDrilldown: false, entityAlertConfig: [], selectedEntity: null })} closeIcon>
        <Modal.Header>Alert Configuration: {selectedEntity == null ? '' : selectedEntity.name}</Modal.Header>
        <Modal.Content scrolling>
        <>
        {
          entityAlertConfig.length > 0 && !fetchingAlerts ?
              <Table compact sortable celled>
              <Table.Header class="sorted ascending">
                <Table.Row>
                  {alertHeaders.map((h, k) => {
                    return (
                        <Table.HeaderCell>{h}</Table.HeaderCell>
                    );
                  })}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {entityAlertConfig.map((row, a) => {
                  return (
                    <Table.Row key={a}>
                      <Table.Cell>
                      {row.policyName}
                      </Table.Cell>
                      <Table.Cell>{row.name}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
              </Table>
          :
          ''
        }
        {
          fetchingAlerts ?
          <div style={{ textAlign: 'center' }}>
            <h4>Loading</h4>
            <Spinner type={Spinner.TYPE.DOT} />
          </div>
          :
          ''
        }
        {
          entityAlertConfig.length == 0 && !fetchingAlerts ?
          <h4>No conditions associated with this entity.</h4>
          :
          ''
        }
        </>
        </Modal.Content>
      </Modal>
      </>
    )
  }

//{this.renderAlerts()}

  render() {
    const { loading, openDrilldown, selectedEntity } = this.state;

    if (loading) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h4>Loading</h4>
          <Spinner type={Spinner.TYPE.DOT} />
        </div>
      )
    } else {
      return (
        <>
        {this.renderDropdown()}
        <Input
          style={{ marginBottom: '3px' }}
          icon="search"
          placeholder="Search Entities..."
          onChange={e => this.setState({ searchText: e.target.value })}
        />
        &nbsp;&nbsp;&nbsp;
        {this.renderEntityTable()}
        {this.renderAlerts()}
        </>
      )
    }
  }
}
