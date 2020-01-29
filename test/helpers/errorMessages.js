module.exports = {
  SIGS_NOT_CORRECT_LEN: 'Signatures list is not the expected length',
  SIGS_NOT_SAME_LEN: 'Sig arrays not the same lengths',
  INVALID_SIG: 'Signature must be from an owner',
  SIG_NOT_UNIQUE: 'Signature must be unique',
  INVALID_SENDER: 'Only owners can submit transactions',
  INIT_OWNER_LIST_FAIL: 'Owners List min is 1 and max is 10',
  INIT_REQ_VAL_FAIL: 'Required signatures must be in the proper range',
  INIT_OWNER_LIST_INVALID: 'Owner addresses must be unique and in order',
  NOT_INITIALIZED: 'Initialization must be complete',
  NOT_OWNER: 'Ownable: caller is not the owner',
  ALREADY_ADMIN: 'Account to be added to admin list is already an admin',
  NOT_ADMIN: 'Account to be removed from admin list is not already an admin',
  NOT_ADMIN_REVERT: 'Calling account is not an administrator.',
  INVALID_RECOVER_LIST: 'The recovery owners length must be the same as previous list',
  INVALID_TIME_RECOVER: '180 Days must pass before recovery can be performed'
}
