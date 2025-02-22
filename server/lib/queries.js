// @ts-check
const db = require('../db')
const format = require('pg-format')

const SUPPORTED_CANDIDATE_CONTRIBUTION_SORT_FIELDS = [
  'name',
  '-name',
  'amount',
  '-amount',
  'date_occurred',
  '-date_occurred',
]

const SUPPORTED_EXPENDITURES_SORT_FIELDS = [
  'amount',
  '-amount',
  'date_occurred',
  '-date_occurred',
]

/**
 * @typedef {Object} CandidateSummary
 * @property {Number} sum - The sum of all donations given to a candidate
 * @property {Number} avg - The avg of all donation given to a candidate
 * @property {Number} max - The largest donation given to a candidate
 * @property {Number} count - The number of donations given to a candidate
 */

/**
 *
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<CandidateSummary>}
 */
const getCandidateSummary = async ({
  ncsbeID,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''

  // Post MVP we should probably find a way to speed this up.
  console.time('getCandidateSummary')
  // TODO: fix aggregated individual contribution logic
  const summary = await db.query(
    `
    with aggregated_contributions as (
      select count(*)    as aggregated_contributions_count,
             sum(amount) as aggregated_contributions_sum
      from contributions
      where contributor_id IS NULl
        and canon_committee_sboe_id = $1
  )
  select sum(amount),
         avg(amount),
         max(amount),
         count(*)::int,
         (select aggregated_contributions_count from aggregated_contributions limit 1) as aggregated_contributions_count,
         (select aggregated_contributions_sum from aggregated_contributions limit 1)   as aggregated_contributions_sum
  from contributions
  where (
    canon_committee_sboe_id = $1 
    ${safeDateOccurredGteFilter}
    ${safeDateOccurredLteFilter}
    )`,
    [ncsbeID]
  )
  console.timeEnd('getCandidateSummary')
  return summary.rows.length > 0 ? summary.rows[0] : {}
}

/**
 * @typedef {Object} CommitteeSummary
 * @property {Number} sum - The sum of all donations given to a candidate
 * @property {Number} avg - The avg of all donation given to a candidate
 * @property {Number} max - The largest donation given to a candidate
 * @property {Number} count - The number of donations given to a candidate
 */

/**
 *
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<CandidateSummary>}
 */
const getCommitteeSummary = async ({
  ncsbeID,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''

  // Post MVP we should probably find a way to speed this up.
  console.time('getCommitteeSummary')
  const summary = await db.query(
    `
    with aggregated_contributions as (
      select count(*)    as aggregated_contributions_count,
             sum(amount) as aggregated_contributions_sum
      from contributions
      where contributor_id IS NULl
        and canon_committee_sboe_id = $1 
  )
  select sum(amount),
         avg(amount),
         max(amount),
         count(*)::int,
         (select aggregated_contributions_count from aggregated_contributions limit 1) as aggregated_contributions_count,
         (select aggregated_contributions_sum from aggregated_contributions limit 1)   as aggregated_contributions_sum
  from contributions
  where (
    canon_committee_sboe_id = $1 
    ${safeDateOccurredGteFilter}
    ${safeDateOccurredLteFilter}
    )`,
    [ncsbeID]
  )
  console.timeEnd('getCommitteeSummary')
  return summary.rows.length > 0 ? summary.rows[0] : {}
}

/**
 *
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {Number|string} args.limit
 * @param {Number|string} args.offset
 * @param {import('pg').PoolClient} args.client
 * @param {string} args.sortBy
 * @param {string} args.name
 * @param {string} args.transaction_type
 * @param {string} args.amount
 * @param {string} args.form_of_payment
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<import('pg').QueryResult>}
 */
const getCandidateContributions = async ({
  ncsbeID,
  limit = 50,
  offset = 0,
  sortBy = null,
  name: nameFilter = null,
  transaction_type: transaction_typeFilter = null,
  amount: amountFilter = null,
  form_of_payment: form_of_paymentFilter = null,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  let order = SUPPORTED_CANDIDATE_CONTRIBUTION_SORT_FIELDS.includes(sortBy)
    ? sortBy
    : ''
  order = order.startsWith('-')
    ? `${order.replace('-', '')} DESC`
    : `${order} ASC`

  const safeNameFilter = nameFilter
    ? format('AND upper(name) ilike %s', `'%${nameFilter.toUpperCase()}%'`)
    : ''
  const safeTransactionTypeFilter = transaction_typeFilter
    ? format(
        'AND upper(transaction_type) = %L',
        transaction_typeFilter.toUpperCase()
      )
    : ''
  const safeAmountFilter = amountFilter
    ? format('AND amount = %L', amountFilter)
    : ''
  const safeFormOfPaymentFilter = form_of_paymentFilter
    ? format(
        'AND upper(form_of_payment) = %L',
        form_of_paymentFilter.toUpperCase()
      )
    : ''
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''

  console.time('getCandidateContributions - query')
  const result = await db.query(
    `select
       count(*) over () as full_count,
       contributor_id,
       transaction_type,
       canon_committee_sboe_id,
       report_name,
       date_occurred,
       account_code,
       amount,
       form_of_payment,
       purpose,
       candidate_referendum_name,
       declaration,
       name,
       city,
       state,
       zip_code,
       profession,
       employer_name
       from contributions
              join contributors c on contributions.contributor_id = c.account_id
      where (
        lower(contributions.canon_committee_sboe_id) = lower($1)
        ${safeNameFilter}
        ${safeTransactionTypeFilter}
        ${safeAmountFilter}
        ${safeFormOfPaymentFilter}
        ${safeDateOccurredGteFilter}
        ${safeDateOccurredLteFilter}
      )
      ${sortBy ? `order by ${order}` : ''}
      limit $2
      offset $3`,
    [ncsbeID, limit, offset]
  )
  console.timeEnd('getCandidateContributions - query')
  return result
}

/**
 *
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {Number|string} args.limit
 * @param {Number|string} args.offset
 * @param {import('pg').PoolClient} args.client
 * @param {string} args.sortBy
 * @param {string} args.name
 * @param {string} args.transaction_type
 * @param {string} args.amount
 * @param {string} args.form_of_payment
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<import('pg').QueryResult>}
 */
const getCommitteeContributions = async ({
  ncsbeID,
  limit = 50,
  offset = 0,
  sortBy = null,
  name: nameFilter = null,
  transaction_type: transaction_typeFilter = null,
  amount: amountFilter = null,
  form_of_payment: form_of_paymentFilter = null,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  let order = SUPPORTED_CANDIDATE_CONTRIBUTION_SORT_FIELDS.includes(sortBy)
    ? sortBy
    : ''
  order = order.startsWith('-')
    ? `${order.replace('-', '')} DESC`
    : `${order} ASC`

  const safeNameFilter = nameFilter
    ? format('AND upper(name) ilike %s', `'%${nameFilter.toUpperCase()}%'`)
    : ''
  const safeTransactionTypeFilter = transaction_typeFilter
    ? format(
        'AND upper(transaction_type) = %L',
        transaction_typeFilter.toUpperCase()
      )
    : ''
  const safeAmountFilter = amountFilter
    ? format('AND amount = %L', amountFilter)
    : ''
  const safeFormOfPaymentFilter = form_of_paymentFilter
    ? format(
        'AND upper(form_of_payment) = %L',
        form_of_paymentFilter.toUpperCase()
      )
    : ''
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''

  console.time('getCommitteeContributions - query')
  const result = await db.query(
    `select
       count(*) over () as full_count,
       contributor_id,
       transaction_type,
       canon_committee_sboe_id,
       report_name,
       date_occurred,
       account_code,
       amount,
       form_of_payment,
       purpose,
       declaration,
       account_id,
       name,
       city,
       state,
       zip_code,
       profession,
       employer_name
       from contributions
              join contributors c on contributions.contributor_id = c.account_id
      where (
        lower(contributions.canon_committee_sboe_id) = lower($1)
        ${safeNameFilter}
        ${safeTransactionTypeFilter}
        ${safeAmountFilter}
        ${safeFormOfPaymentFilter}
        ${safeDateOccurredGteFilter}
        ${safeDateOccurredLteFilter}
      )
      ${sortBy ? `order by ${order}` : ''}
      limit $2
      offset $3`,
    [ncsbeID, limit, offset]
  )
  console.timeEnd('getCommitteeContributions - query')
  return result
}

/**
 * Gets all contributors and contributions
 * null contributor_id's are Aggregated Individual Contributions
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {import('pg').PoolClient} args.client
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<import('pg').QueryResult>}
 */
const getCandidateContributionsForDownload = ({
  ncsbeID,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''
  return db.query(
    `select count(*) over () as full_count,
       contributor_id,
       transaction_type,
       canon_committee_sboe_id,
       report_name,
       date_occurred,
       account_code,
       amount,
       form_of_payment,
       purpose,
       candidate_referendum_name,
       declaration,
       coalesce(name, 'Aggregated Individual Contribution') as name,
       city,
       state,
       zip_code,
       profession,
       employer_name
       from contributions
              left outer join contributors c on contributions.contributor_id = c.account_id
      where (
        lower(contributions.canon_committee_sboe_id) = lower($1)
        ${safeDateOccurredGteFilter}
        ${safeDateOccurredLteFilter}
        )
      `,
    [ncsbeID]
  )
}

/**
 * Gets all contributors and contributions
 * null contributor_id's are Aggregated Individual Contributions
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {import('pg').PoolClient} args.client
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<import('pg').QueryResult>}
 */
const getCommitteeContributionsForDownload = ({
  ncsbeID,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''
  return db.query(
    `select count(*) over () as full_count,
       contributor_id,
       transaction_type,
       canon_committee_sboe_id,
       report_name,
       date_occurred,
       account_code,
       amount,
       form_of_payment,
       purpose,
       declaration,
       account_id,
       coalesce(name, 'Aggregated Individual Contribution') as name,
       city,
       state,
       zip_code,
       profession,
       employer_name
       from contributions
              left outer join contributors c on contributions.contributor_id = c.account_id
      where (
        lower(contributions.canon_committee_sboe_id) = lower($1)
        ${safeDateOccurredGteFilter}
        ${safeDateOccurredLteFilter}
        )`,
    [ncsbeID]
  )
}

/**
 * Gets all expenditures for download
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {import('pg').PoolClient} args.client
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<import('pg').QueryResult>}
 */
const getExpendituresForDownload = ({
  ncsbeID,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''
  return db.query(
    `select count(*) over () as full_count,
    e.date_occurred,
    e.form_of_payment,
    e.transaction_type,
    e.purpose,
    e.amount,
    v.name
    from expenditures e join vendors v on e.contributor_id = v.account_id
    where (
      lower(e.original_committee_sboe_id) = lower($1)
        ${safeDateOccurredGteFilter}
        ${safeDateOccurredLteFilter}
  )`,
    [ncsbeID]
  )
}

/**
 *
 * @param {string} ncsbeID
 * @returns {Promise<Object|null>}
 */
const getCandidate = async (ncsbeID) => {
  const result = await db.query(
    `select * from committees
      where upper(committees.sboe_id) = upper($1)`,
    [ncsbeID]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

/**
 *
 * @param {string} ncsbeID
 * @returns {Promise<Object|null>}
 */
const getCommittee = async (ncsbeID) => {
  const result = await db.query(
    `select * from committees
      where upper(committees.sboe_id) = upper($1)`,
    [ncsbeID]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

/**
 * @param {Object} args
 * @param {string} args.contributorId
 * @param {Number|string|null} args.limit
 * @param {Number|string|null} args.offset
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 **/
const getContributorContributions = ({
  contributorId,
  limit = null,
  offset = null,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''
  return db.query(
    `select *, count(*) over () as full_count,
  (select sum(amount) from contributions c where contributor_id = $1
    and c.canon_committee_sboe_id = contributions.canon_committee_sboe_id) as total_contributions_to_committee
  from contributions
  join committees on committees.sboe_id = contributions.canon_committee_sboe_id
  where (
    contributor_id = $1
    ${safeDateOccurredGteFilter}
    ${safeDateOccurredLteFilter}
    )
  order by contributions.date_occurred asc
  limit $2
  offset $3
  `,
    [contributorId, limit, offset]
  )
}

/**
 * @param {Object} args
 * @param {import('pg').PoolClient} args.client
 * @param {string} args.contributorId
 **/
const getContributor = ({ client, contributorId }) =>
  db.query(`select * from contributors where account_id = $1`, [contributorId])

/**
 *
 * @param {Object} args
 * @param {string} args.ncsbeID
 * @param {Number|string} args.limit
 * @param {Number|string} args.offset
 * @param {string} args.sortBy
 * @param {string} args.date_occurred_gte
 * @param {string} args.date_occurred_lte
 * @returns {Promise<import('pg').QueryResult>}
 */
const getExpenditures = async ({
  ncsbeID,
  limit = 50,
  offset = 0,
  sortBy = null,
  date_occurred_gte: date_occurred_gteFilter = null,
  date_occurred_lte: date_occurred_lteFilter = null,
}) => {
  let order = SUPPORTED_EXPENDITURES_SORT_FIELDS.includes(sortBy) ? sortBy : ''
  order = order.startsWith('-')
    ? `${order.replace('-', '')} DESC`
    : `${order} ASC`

  const safeDateOccurredGteFilter = date_occurred_gteFilter
    ? format('AND date_occurred >= CAST(%L as DATE)', date_occurred_gteFilter)
    : ''
  const safeDateOccurredLteFilter = date_occurred_lteFilter
    ? format('AND date_occurred <= CAST(%L as DATE)', date_occurred_lteFilter)
    : ''
  console.time('getExpenditures - query')
  const result = await db.query(
    `select count(*) over () as full_count,
      e.date_occurred,
      e.form_of_payment,
      e.transaction_type,
      e.purpose,
      e.amount,
      v.name
    from expenditures e join vendors v on e.contributor_id = v.account_id
    where (
      lower(e.original_committee_sboe_id) = lower($1)
      ${safeDateOccurredGteFilter}
      ${safeDateOccurredLteFilter}
    )
    ${sortBy ? `order by e.${order}` : ''}
    limit $2
    offset $3`,
    [ncsbeID, limit, offset]
  )
  console.timeEnd('getExpenditures - query')
  return result
}

module.exports = {
  getCandidateSummary,
  getCandidateContributions,
  getCandidate,
  getCandidateContributionsForDownload,
  getContributorContributions,
  getContributor,
  getCommitteeContributions,
  getCommitteeContributionsForDownload,
  getCommittee,
  getCommitteeSummary,
  getExpenditures,
  getExpendituresForDownload,
}
