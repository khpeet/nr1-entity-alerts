module.exports = {
  allEntities: (accountId, cursor) => {
    if (cursor == null) {
      return `
        {
        actor {
          entitySearch(query: "accountId = ${accountId} and reporting='true' and alertSeverity != 'NOT_CONFIGURED' and type not in ('DASHBOARD', 'WORKFLOW', 'CONDITION', 'SECURE_CRED', 'ENDPOINT', 'ISSUE', 'POLICY', 'MONITOR_DOWNTIME')") {
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
          entitySearch(query: "accountId = ${accountId} and reporting='true' and alertSeverity != 'NOT_CONFIGURED' and type not in ('DASHBOARD', 'WORKFLOW', 'CONDITION', 'SECURE_CRED', 'ENDPOINT', 'ISSUE', 'POLICY', 'MONITOR_DOWNTIME')") {
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
  conditionIds: (selectedEntity) => {
    let entityName = selectedEntity.name;
    let guid = selectedEntity.guid;
    let accountId = selectedEntity.accountId
    return `
    {
      actor {
        account(id: ${accountId}) {
          nrql(query: "FROM NrAiSignal SELECT uniques(conditionId, 5000) as 'conditions' where entity.guid = '${guid}' since 2 weeks ago", timeout: 120) {
            results
          }
        }
      }
    }
    `;
  },

  conditionDetail: (accountId, conditions) => {
    return `
      {
        actor {
          entitySearch(query: "accountId = ${accountId} and type='CONDITION' and tags.id in ${conditions}") {
            results {
              entities {
                name
                tags {
                  key
                  values
                }
              }
            }
          }
        }
      }
    `;
  },

  policies: (accountId) => {
    return `
      {
        actor {
          account(id: ${accountId}) {
            alerts {
              policiesSearch {
                policies {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;
  }
}
