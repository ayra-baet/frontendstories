import { Client } from "appwrite";
import config from "../config/config";

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

export default client;
