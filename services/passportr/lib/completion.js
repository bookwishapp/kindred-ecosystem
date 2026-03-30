function checkCompletion(rule, stampedVenueIds, allVenues) {
  if (rule.type === 'all') {
    const requiredVenues = allVenues.filter(v => v.required);
    return requiredVenues.every(v => stampedVenueIds.includes(v.id));
  }

  if (rule.type === 'percentage') {
    const required = Math.ceil(allVenues.length * (rule.percent / 100));
    return stampedVenueIds.length >= required;
  }

  if (rule.type === 'minimum') {
    return stampedVenueIds.length >= rule.count;
  }

  if (rule.type === 'required_plus') {
    const requiredStamped = rule.required.every(id => stampedVenueIds.includes(id));
    const optionalCount = stampedVenueIds.filter(id => !rule.required.includes(id)).length;
    return requiredStamped && optionalCount >= (rule.minimum_optional || 0);
  }

  return false;
}

module.exports = { checkCompletion };
