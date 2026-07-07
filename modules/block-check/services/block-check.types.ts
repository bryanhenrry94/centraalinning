export type BlokCheckResponse = {
  identification_type: string;
  document_number: string;
  person_id: string;
  fullname?: string;
  has_blockade: boolean;
};
