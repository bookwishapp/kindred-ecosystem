// User profile and subscription state (placeholder)

class UserStore {
  constructor() {
    this.profile = null;
    this.subscription = null;
    this.trialWords = {
      used: 0,
      remaining: 15000,
      limit: 15000
    };
  }

  setProfile(profile) {
    this.profile = profile;
    if (profile) {
      this.trialWords = {
        used: profile.trial_words_used || 0,
        remaining: profile.trial_words_remaining || 15000,
        limit: profile.trial_word_limit || 15000
      };
      this.subscription = {
        status: profile.subscription_status,
        canWrite: profile.can_write
      };
    }
  }
}

export default new UserStore();