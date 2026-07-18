export interface IslandVisual {
  label: string;
  gradient: string;
  photoUrl?: string;
}

export const ISLAND_VISUALS: Record<string, IslandVisual> = {
  ARU: {
    label: "Aruba",
    gradient: "linear-gradient(135deg, #4189DD 0%, #F5C900 55%, #EF4135 100%)",
  },
  BON: {
    label: "Bonaire",
    gradient: "linear-gradient(135deg, #003DA5 0%, #FFD100 55%, #FFFFFF 100%)",
    photoUrl: "/static/images/auth/bonaire-isla-final.png",
  },
  CUR: {
    label: "Curaçao",
    gradient: "linear-gradient(135deg, #002B7F 0%, #FFD100 55%, #FFFFFF 100%)",
  },
};
