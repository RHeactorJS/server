import {ImmutableAggregateRepository, AggregateIndex, ModelEvent, ModelEventType} from '@rheactorjs/event-store'
import {UserModel, MaybeUserModelType} from '../model/user'
import {EntryNotFoundError} from '@rheactorjs/errors'
import {EmailValueType} from '@rheactorjs/value-objects'
import Promise from 'bluebird'
import {UserCreatedEvent, UserEmailChangedEvent} from '../event/user'
import {PaginationType} from '../util/pagination'

export class UserRepository extends ImmutableAggregateRepository {
  /**
   * Creates a new user repository
   *
   * @param {redis.client} redis
   * @constructor
   */
  constructor (redis) {
    super(UserModel, 'user', redis)
    this.index = new AggregateIndex(this.alias, redis)
  }

  /**
   * Find a user by email
   *
   * @param {EmailValue} email
   * @return {Promise.<UserModel>}
   */
  findByEmail (email) {
    EmailValueType(email)
    return this
      .getByEmail(email)
      .catch(EntryNotFoundError, () => {
        return null
      })
  }

  /**
   * Find all users
   *
   * @param {Pagination} pagination
   * @return {Promise.<Array.<UserModel>>}
   */
  listAll (pagination) {
    PaginationType(pagination)
    return this.index.getAll('email')
      .then(userIds => {
        const total = userIds.length
        return Promise.map(pagination.splice(userIds), userId => this.getById(userId))
          .then(users => pagination.result(users, total))
      })
  }

  /**
   * Get a user by email
   *
   * @param {EmailValue} email
   * @return {Promise.<UserModel>}
   */
  getByEmail (email) {
    EmailValueType(email)
    return this.index.find('email', email.toString())
      .then((id) => {
        if (!id) {
          throw new EntryNotFoundError('User with email "' + email.toString() + '" not found')
        }
        return this.getById(id)
      })
  }

  /**
   * Create a new user
   *
   * The precondition is that a user with the same email address must not exist,
   * therefore the email address index for this aggregate is consulted before
   *
   * @param {Object} userdata
   * @param {UserModel} author Can be empty, if user is creating themselves
   * @returns {Promise.<Number>} of the id
   */
  add (userdata, author) {
    MaybeUserModelType(author)
    const data = {
      email: userdata.email.toString(),
      firstname: userdata.firstname,
      lastname: userdata.lastname,
      password: userdata.password,
      isActive: userdata.isActive
    }
    if (userdata.avatar) {
      data.avatar = userdata.avatar.toString()
    }
    return this.redis.incrAsync(this.alias + ':id')
      .then(id => this.index.addIfNotPresent('email', data.email, `${id}`)
        .then(() => this.persistEvent(new ModelEvent(`${id}`, UserCreatedEvent, data, new Date(), author ? author.meta.id : undefined)))
      )
  }

  /**
   * Persist a user event
   *
   * @param {ModelEvent} modelEvent
   * @return {ModelEvent}
   */
  persistEvent (modelEvent) {
    ModelEventType(modelEvent)
    return super.persistEvent(modelEvent)
      .then(() => this.postPersist(modelEvent))
      .then(() => modelEvent)
  }

  /**
   * Persist a user event
   *
   * @param {ModelEvent} modelEvent
   */
  postPersist (modelEvent) {
    if (modelEvent.name === UserEmailChangedEvent) {
      return Promise
        .join(
          this.index.remove('email', modelEvent.data.oldemail, modelEvent.aggregateId),
          this.index.add('email', modelEvent.data.email, modelEvent.aggregateId)
        )
        .then(() => modelEvent)
    }
    return Promise.resolve(modelEvent)
  }
}
