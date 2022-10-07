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
      selectedEntity: null
    };

    this.handleChange = this.handleChange.bind(this);
  }


  async componentDidMount() {
    let cursor = null;
    let allEntities = [];
    await this.getEntities(cursor, allEntities);
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

  async getAlerts(entity) {
    let res = await NerdGraphQuery.query({query: query.incidentCount(entity)});

    if (res.errors) {
      console.debug(`Failed to retrieve alerts`);
      console.debug(res.errors);
    } else {
      let alerts = res.data.actor.account.nrql.results;
      return alerts;
    }
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

  async openDrilldownAndGetAlerts(r) {
    let { openDrilldown, selectedEntity } = this.state;

    await this.setState({
      openDrilldown: true,
      fetchingAlerts: true,
      selectedEntity: r
    });

    let alerts = await this.getAlerts(r);

    await this.setState({
      entityAlertConfig: alerts,
      fetchingAlerts: false
    })
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
                <Table.Cell onClick={() => this.openDrilldownAndGetAlerts(row)}>
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

    const alertHeaders = ['Policy', 'Condtion'];

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
                      {row.facet[0]}
                      </Table.Cell>
                      <Table.Cell>{row.facet[1]}</Table.Cell>
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
          <h4>This entity has not triggered any alerts in the past 13 months.</h4>
          :
          ''
        }
        </>
        </Modal.Content>
      </Modal>
      </>
    )
  }


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
