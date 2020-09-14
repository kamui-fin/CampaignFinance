//@ts-check
const { getClient } = require('../db')

/**
 * @typedef {Object} SearchResult
 * @property {Array<any>} data
 * @property {number} count
 */

/**
 * @param {string} name
 * @param {string|number} offset
 * @param {string|number} limit
 * @param {string|number} trigramLimit
 * @returns {Promise<SearchResult>}
 * @throws an error if the pg query or connection fails
 */
const searchContributors = async (
  name,
  offset = 0,
  limit = 50,
  trigramLimit = 0.6
) => {
  let client = null
  try {
    const nameILike = `%${name}%`
    client = await getClient()
    await client.query('select set_limit($1)', [trigramLimit])
    // searches by full name or the first word of the name
    // because of data integrity, we can't guarantee the first split string is the first name
    const results = await client.query(
      `select *, count(*) over() as full_count, similarity(name, $1) as sml
      from contributors where name % $1
        or name ilike $4
      order by sml desc
      limit $2 offset $3`,
      [name, limit, offset, nameILike]
    )
    return {
      data: results.rows,
      count: results.rows.length > 0 ? results.rows[0].full_count : 0,
    }
  } catch (error) {
    throw error
  } finally {
    if (client !== null) {
      client.release()
    }
  }
}

/**
 * @param {string} name
 * @param {string|number} offset
 * @param {string|number} limit
 * @param {string|number} trigramLimit
 * @param {string} sort
 * @returns {Promise<SearchResult>}
 * @throws an error if the pg query or connection fails
 */
const searchCommittees = async (
  name,
  offset = 0,
  limit = 50,
  trigramLimit = 0.6,
  sort = 'first_last_sml'
) => {
  console.log('sort', sort)
  let client = null
  let order = [
    'candidate_full_name',
    '-candidate_full_name',
    'first_last_sml',
    '-first_last_sml',
  ].includes(sort)
    ? sort
    : 'first_last_sml'
  order = order.startsWith('-') ? `${sort} DESC` : sort
  console.log('order', order)
  try {
    const nameILike = `%${name}%`
    client = await getClient()
    await client.query('select set_limit($1)', [trigramLimit])
    const results = await client.query(
      `select *,
        similarity(candidate_last_name, $1) as last_name_sml,
        similarity(candidate_first_last_name, $1) as first_last_sml,
        similarity(candidate_full_name, $1) as full_name_sml,
        count(*) over() as full_count
      from committees
        where
          candidate_full_name % $1
          OR candidate_last_name % $1
          OR candidate_full_name ilike $4
        order by $5
        limit $2 offset $3`,
      [name, limit, offset, nameILike, order]
    )
    console.log(results.rows.slice(0, 5).map((row) => row.candidate_full_name))

    return {
      data: results.rows,
      count: results.rows.length > 0 ? results.rows[0].full_count : 0,
    }
  } catch (error) {
    throw error
  } finally {
    if (client !== null) {
      client.release()
    }
  }
}

module.exports = {
  searchContributors,
  searchCommittees,
}
