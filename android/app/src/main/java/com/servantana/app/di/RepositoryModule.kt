package com.servantana.app.di

import com.servantana.app.data.repository.AIRepository
import com.servantana.app.data.repository.AIRepositoryImpl
import com.servantana.app.data.repository.AuthRepository
import com.servantana.app.data.repository.AuthRepositoryImpl
import com.servantana.app.data.repository.BookingRepository
import com.servantana.app.data.repository.BookingRepositoryImpl
import com.servantana.app.data.repository.FavoritesRepository
import com.servantana.app.data.repository.FavoritesRepositoryImpl
import com.servantana.app.data.repository.LocationRepository
import com.servantana.app.data.repository.LocationRepositoryImpl
import com.servantana.app.data.repository.MessageRepository
import com.servantana.app.data.repository.MessageRepositoryImpl
import com.servantana.app.data.repository.ReviewRepository
import com.servantana.app.data.repository.ReviewRepositoryImpl
import com.servantana.app.data.repository.ServiceRepository
import com.servantana.app.data.repository.ServiceRepositoryImpl
import com.servantana.app.data.repository.UserRepository
import com.servantana.app.data.repository.UserRepositoryImpl
import com.servantana.app.data.repository.WorkerRepository
import com.servantana.app.data.repository.WorkerRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindWorkerRepository(impl: WorkerRepositoryImpl): WorkerRepository

    @Binds
    @Singleton
    abstract fun bindBookingRepository(impl: BookingRepositoryImpl): BookingRepository

    @Binds
    @Singleton
    abstract fun bindMessageRepository(impl: MessageRepositoryImpl): MessageRepository

    @Binds
    @Singleton
    abstract fun bindAIRepository(impl: AIRepositoryImpl): AIRepository

    @Binds
    @Singleton
    abstract fun bindUserRepository(impl: UserRepositoryImpl): UserRepository

    @Binds
    @Singleton
    abstract fun bindFavoritesRepository(impl: FavoritesRepositoryImpl): FavoritesRepository

    @Binds
    @Singleton
    abstract fun bindLocationRepository(impl: LocationRepositoryImpl): LocationRepository

    @Binds
    @Singleton
    abstract fun bindReviewRepository(impl: ReviewRepositoryImpl): ReviewRepository

    @Binds
    @Singleton
    abstract fun bindServiceRepository(impl: ServiceRepositoryImpl): ServiceRepository
}
