import axios from 'axios';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { localBrands } from '@/store/local.brands'

type TBrand = {
	id: number; 
	name: string; 
	popular?: boolean;
}

export type TCarState = {
	loading: boolean;
	vinState: string;
	bodyNumber: string;
	step: number;
	error: string;
	noResultFetchMessage: string;
	avtoInfo: any;
	brands: TBrand[];
	models: any;
	years: any;
	generations: any;
	bodyConfigurations: any;
}

export type TCarInfoActions = {
	incrementStep: () => void;
	decrimentStep: () => void;
	setVIN: (vin: string) => void;
	setError: () => void;
	clearError: () => void;
	setMessage: (mes: string) => void;
	recalculate: () => void;
	setBodyNumber: (vin: string) => void;
	setAvtoInfo: (data: any) => void;
	setBrands: (data: any) => void;
	setModels: (data: any) => void;
	setYears: (data: any) => void;
	setGenerations: (data: any) => void;
	setBodyConfigurations: (data: any) => void;
	showLoader: () => void;
	hideLoader: () => void;
	fetchCarsInfo: (data: any) => void;
}

export const useCarInfo = create<TCarState & TCarInfoActions>((set, get) => ({
	loading: true,
	vinState: "",
	bodyNumber: "",
	step: 0,
	error: "",
	noResultFetchMessage: "Ничего не выбрано",
	avtoInfo: {},
	brands: [],
	models: [],
	years: [],
	generations: [],
	bodyConfigurations: [],
	setVIN: (vin) => set({ vinState: vin }),
	setError: () => set({ error: 'Извините, сервис временно недоступен. Мы уже работает над этим, повторите попыку позже.' }),
	clearError: () => set({ error: '' }),
	setMessage: (mes) => set({ noResultFetchMessage: mes }),
	recalculate: () => set({ step: 0, bodyNumber: '', avtoInfo: {} }),
	incrementStep: () => set((state) => ({ step: state.step + 1 })),
	decrimentStep: () => set((state) => ({ step: state.step - 1 })),
	setBodyNumber: (vin) => set({ bodyNumber: vin }),
	setAvtoInfo: (data) => set({ avtoInfo: data }),
	setBrands: (data) => set({ brands: data }),
	setModels: (data) => set({ models: data }),
	setYears: (data) => set({ years: data }),
	setGenerations: (data) => set({ generations: data }),
	setBodyConfigurations: (data) => set({ bodyConfigurations: data }),
	showLoader: () => set({ loading: true }),
	hideLoader: () => set({ loading: false }),
	fetchCarsInfo: async (data) => {
		data.params.categoryId = 1; // 1 - легковые автомобили
		get().setVIN('');
		get().setBodyNumber('');
		const url = new URL(data.url);
		Object.keys(data.params).forEach(key => url.searchParams.append(key, data.params[key])) // добавляем GET параметры	
		get().showLoader(); // показываем загрузку
		try {
			const response = await axios.get(url.href);
			const fetchData = response.data; // получаем данные
			if(fetchData.status === 'success'){
				switch (data.name) {
					case 'brands':
						const filteredBrands = fetchData.data.vehicleBrands.filter((brand: TBrand) => {
							const b = localBrands.find(b => b.name.toLowerCase() === brand.name.toLowerCase());
							if (!b) return false; // Убедитесь, что возвращаете true/false для корректной фильтрации
							brand.popular = b.popular;
							return true;
						});
						set({ brands: filteredBrands });
						break;
					case 'models':
						set({ years: [] });
						set({ generations: [] });
						set({ bodyConfigurations: [] });
						const currentBrand = get().brands.find(b => b.id === Number(data.params.brandId));
						if(!currentBrand){ get().setError() }			
						get().setAvtoInfo({ brand: currentBrand });
						set({ models: fetchData.data.vehicleModels });
						break;
					case 'years':
						set({ generations: [] });
						set({ bodyConfigurations: [] });
						const currentModel = get().models.find(m => m.id === Number(data.params.modelId));
						if(!currentModel){ get().setError() }
						delete currentModel.category;			
						get().setAvtoInfo({ ...get().avtoInfo, model: currentModel });
						set({ years: fetchData.data.vehicleYears });
						break;
					case 'generations':
						set({ bodyConfigurations: [] });
						if(!data.params.year){ get().setError() }
						get().setAvtoInfo({ ...get().avtoInfo, year: data.params.year });
						let generations = fetchData.data.vehicleGenerations;
						if(generations.length == 1){
							generations[0].name = "Без поколения";
						}
						set({ generations: generations });
						break;
					case 'bodyConf':
						const currentGeneration = get().generations.find(g => g.id === Number(data.params.generationId));
						if(!currentGeneration){ get().setError() }		
						get().setAvtoInfo({ ...get().avtoInfo, generation: currentGeneration });
						set({ bodyConfigurations: fetchData.data.vehicleBodyConfigurations });
						break;
					case 'modifications':
						// commit("setModifications", response.data.vehicleModifications);
						break;
					default:
						break;
				}
			} else {
				get().setError(); // если не удача, выводим ошибку
				console.log("fetch-"+data.name, fetchData);
			}	
		} catch (error) {
			get().setError(); // если не удача, выводим ошибку
			console.error("fetch-"+data.name, error);
		} finally {
			get().hideLoader();
		}
	}
}))