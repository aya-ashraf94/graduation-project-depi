export function getConditionLabel(condition: string): string {
  switch (condition) {
    case 'new_with_tags': return 'New';
    case 'excellent': return 'New';
    case 'good': return 'Used';
    case 'fair': case 'distressed': return 'Used';
    default: return 'Used';
  }
}

export function getConditionClass(condition: string): string {
  switch (condition) {
    case 'new_with_tags': return 'cond-new';
    case 'excellent': return 'cond-new';
    case 'good': return 'cond-used';
    case 'fair': case 'distressed': return 'cond-used';
    default: return 'cond-used';
  }
}
