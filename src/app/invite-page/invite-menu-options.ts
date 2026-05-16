export interface CourseMenuOption {
  value: string;
  label: string;
  description: string;
}

export const starterMenuOptions: CourseMenuOption[] = [
  {
    value: 'Charred Watermelon',
    label: 'Charred Watermelon',
    description: 'Whipped feta cheese, pomegranate molasses and mint.',
  },
  {
    value: 'Spicy Tuna Tostada',
    label: 'Spicy Tuna Tostada',
    description: 'Sriracha mayo, grilled pineapple and sesame seeds.',
  },
  {
    value: 'Steak Tartare',
    label: 'Steak Tartare',
    description: 'Smoked oyster mayonnaise and matchstick potatoes.',
  },
];

export const mainMenuOptions: CourseMenuOption[] = [
  {
    value: 'Charred Hispi Cabbage',
    label: 'Charred Hispi Cabbage',
    description: 'Green pepper and lemon tahini, spring onion and pine nut crumb.',
  },
  {
    value: 'Grilled Butterflied Seabass',
    label: 'Grilled Butterflied Seabass',
    description: 'Ox heart tomato and sauce vierge.',
  },
  {
    value: 'Smoked Blythburgh Pork Belly Rib',
    label: 'Smoked Blythburgh Pork Belly Rib',
    description: 'Monkey Gland glaze, cabbage and red jalapeno slaw.',
  },
  {
    value: 'Rump Steak 300g',
    label: 'Rump Steak 300g',
    description: 'Served with Bearnaise sauce.',
  },
  {
    value: 'Fillet Steak 200g',
    label: 'Fillet Steak 200g',
    description: 'Served with Bearnaise sauce.',
  },
  {
    value: 'Ribeye Steak 300g',
    label: 'Ribeye Steak 300g',
    description: 'Served with Bearnaise sauce.',
  },
];

export const dessertMenuOptions: CourseMenuOption[] = [
  {
    value: 'Pavlova',
    label: 'Pavlova',
    description: 'Vanilla ice cream and black pepper strawberries.',
  },
];

export const mainsSharingSidesSummary =
  'All mains are served with sharing sides: Beef Fat Chips, Mixed Salad Leaves, and Tenderstem Broccoli.';

export interface RsvpMenuSelectionFields {
  inviteeStarter: string;
  inviteeMain: string;
  inviteeDessert: string;
  plusOneStarter: string;
  plusOneMain: string;
  plusOneDessert: string;
}

export function createDefaultMenuSelectionFields(): RsvpMenuSelectionFields {
  return {
    inviteeStarter: starterMenuOptions[0].value,
    inviteeMain: mainMenuOptions[0].value,
    inviteeDessert: dessertMenuOptions[0].value,
    plusOneStarter: starterMenuOptions[0].value,
    plusOneMain: mainMenuOptions[0].value,
    plusOneDessert: dessertMenuOptions[0].value,
  };
}

const menuChoiceAliases: Record<string, string> = {
  'charred watermelon (gf/v)': 'Charred Watermelon',
  'spicy tuna tostada (gf)': 'Spicy Tuna Tostada',
  'charred hispi cabbage (gf/vg)': 'Charred Hispi Cabbage',
  'grilled butterflied seabass (gf)': 'Grilled Butterflied Seabass',
  'smoked blythburgh pork belly rib (gf)': 'Smoked Blythburgh Pork Belly Rib',
  'rump steak 300g (gf)': 'Rump Steak 300g',
  'fillet steak 200g (gf) (+gbp8 supplement)': 'Fillet Steak 200g',
  'ribeye steak 300g (gf) (+gbp10 supplement)': 'Ribeye Steak 300g',
  'pavlova (gf/v)': 'Pavlova',
};

export function normalizeMenuChoiceValue(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return menuChoiceAliases[trimmed.toLowerCase()] ?? trimmed;
}
