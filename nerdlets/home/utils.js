module.exports = {
  allEntities: (cursor) => {
    if (cursor == null) {
      return `
        {
        actor {
          entitySearch(query: "reporting='true' and alertSeverity != 'NOT_CONFIGURED' and type not in ('DASHBOARD', 'WORKFLOW', 'CONDITION', 'SECURE_CRED', 'ENDPOINT')") {
            counts(facet: TYPE) {
              facet
              count
            }
            results {
              entities {
                type
                name
                guid
                alertSeverity
                accountId
              }
              nextCursor
            }
          }
        }
      }
    `;
  } else {
    return `
      {
        actor {
          entitySearch(query: "reporting='true' and alertSeverity != 'NOT_CONFIGURED' and type not in ('DASHBOARD', 'WORKFLOW', 'CONDITION', 'SECURE_CRED', 'ENDPOINT')") {
            counts(facet: TYPE) {
              facet
              count
            }
            results(cursor: "${cursor}") {
              entities {
                type
                name
                guid
                alertSeverity
                accountId
              }
              nextCursor
            }
          }
        }
      }
    `;
  }
  },
  incidentCount: (selectedEntity) => {
    let entityName = selectedEntity.name;
    let guid = selectedEntity.guid;
    let accountId = selectedEntity.accountId
    return `
    {
      actor {
        account(id: ${accountId}) {
          nrql(query: "SELECT latest(timestamp) as 'ts' FROM NrAiIncident facet policyName, conditionName where event = 'close' and (targetName like '%${entityName}%' or entity.guid = '${guid}') since 6 months ago LIMIT 500", timeout: 120) {
            results
          }
        }
      }
    }
    `;
  }
}
